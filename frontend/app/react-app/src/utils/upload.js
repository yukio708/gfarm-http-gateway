import { encodePath } from "./func";
import { createDir } from "./dircommon";
import { API_URL } from "./api_url";

// file:
// File + dirPath, isDirectory
//   - dirPath
//   - isDirectory
//   - lastModified
//   - lastModifiedDate
//   - name
//   - size
//   - type
//   - webkitRelativePath
// or, DirectoryEntry + dirPath
//   - dirPath
//   - filesystem
//   - fullPath
//   - isDirectory
//   - isFile
//   - name

async function uploadFile(currentDir, file, dirSet, setTasks, refresh) {
    if (!file) {
        alert("Please select a file");
        return;
    }
    const uploaddirpath = currentDir.replace(/\/$/, "") + "/" + file.dirPath;
    const fullpath = file.isDirectory
        ? uploaddirpath
        : currentDir.replace(/\/$/, "") + "/" + file.dirPath + file.name;

    console.log("uploaddirpath", uploaddirpath);
    console.log("fullpath", fullpath);

    const taskId = fullpath + Date.now();
    const startTime = Date.now();

    const newTask = {
        taskId,
        name: file.name,
        value: 0,
        done: false,
        type: "upload",
        status: "uploading",
        message: "",
        onCancel: () => {},
        startTime: startTime,
        updateTime: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);

    // createdir
    if (!dirSet.has(uploaddirpath)) {
        createDir(uploaddirpath, "p=on");
        dirSet.add(uploaddirpath);
        console.log("dirSet", dirSet);
    }

    if (file.isDirectory) {
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: "completed",
                          value: 100,
                          message: "",
                          done: true,
                          updateTime: Date.now(),
                      }
                    : task
            )
        );
        return;
    }

    const epath = encodePath(fullpath);
    const uploadUrl = `${API_URL}/file` + epath;
    console.log("uploadUrl:", uploadUrl);
    const mtime = Math.floor(file.lastModified / 1000); // msec. -> sec.

    try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.responseType = "json";

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          onCancel: () => {
                              xhr.abort();
                              setTasks((prev) =>
                                  prev.map((task) =>
                                      task.taskId === taskId
                                          ? {
                                                ...task,
                                                status: "cancelled",
                                                message: "Upload cancelled",
                                                done: true,
                                                updateTime: Date.now(),
                                            }
                                          : task
                                  )
                              );
                              console.warn("cancel:", file);
                          },
                          updateTime: Date.now(),
                      }
                    : task
            )
        );

        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("X-File-Timestamp", mtime);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime; // msec.
                const speed = Math.round((event.loaded / elapsedTime) * 1000);
                const sec = Math.floor(elapsedTime / 1000);
                const value = percent;
                const message = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? { ...task, value, message, updateTime: Date.now() }
                            : task
                    )
                );
                console.log("uploaded: %d / %d (%d %)", event.loaded, event.total, percent);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? {
                                  ...task,
                                  status: "completed",
                                  value: 100,
                                  message: "",
                                  done: true,
                                  updateTime: Date.now(),
                              }
                            : task
                    )
                );
                console.log("Upload: success");
            } else {
                const detail = xhr.response?.detail;
                const stderr = detail?.stderr ? JSON.stringify(detail.stderr) : null;
                const message = stderr
                    ? `Error: HTTP ${xhr.status}: ${xhr.statusText}, stderr=${stderr}`
                    : `Error: HTTP ${xhr.status}: ${xhr.statusText}, detail=${JSON.stringify(detail)}`;
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? { ...task, status: "error", message, updateTime: Date.now() }
                            : task
                    )
                );
                console.error(message);
            }
            refresh();
        };
        xhr.onerror = () => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? {
                              ...task,
                              status: "error",
                              message: "Network error",
                              done: true,
                              updateTime: Date.now(),
                          }
                        : task
                )
            );
            console.error("Network error");
        };
        xhr.send(file);
    } catch (error) {
        alert("Cannot upload:" + error);
        console.error("Cannot upload:", error);

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: "error",
                          message: error,
                          done: true,
                          updateTime: Date.now(),
                      }
                    : task
            )
        );
        throw error;
    }

    // fetch
    // const controller = new AbortController();
    // const signal = controller.signal;
    // const newTask = {
    //     taskId,
    //     name: file.name,
    //     value: 0,
    //     done: false,
    //     status: "uploading",
    //     message: "",
    //     onCancel: () => {
    //         controller.abort();
    //         console.log("cancel:", file);
    //     },
    //     startTime: startTime,
    //     updateTime: Date.now(),
    // };
    // setTasks((prev) => [...prev, newTask]);
    // try {
    //     let uploaded = 0;
    //     const reader = file.stream().getReader();

    //     const stream = new ReadableStream({
    //         start(controller) {
    //             function push() {
    //                 reader.read().then(({ done, value }) => {
    //                     if (done) {
    //                         controller.close();
    //                         return;
    //                     }
    //                     uploaded += value.length;
    //                     const percent = Math.floor((uploaded / file.size) * 100);
    //                     const elapsedTime = Date.now() - startTime;
    //                     const speed = Math.round((uploaded / elapsedTime) * 1000);
    //                     const sec = Math.floor(elapsedTime / 1000);
    //                     const message = `${percent} % | ${sec} sec | ${speed} bytes/sec`;

    //                     setTasks((prev) =>
    //                         prev.map((task) =>
    //                             task.taskId === taskId
    //                                 ? { ...task, value: percent, message, updateTime: Date.now() }
    //                                 : task
    //                         )
    //                     );
    //                     controller.enqueue(value);
    //                     push();
    //                 });
    //             }
    //             push();
    //         },
    //     });

    //     const response = await fetch(uploadUrl, {
    //         method: "PUT",
    //         headers: {
    //             "Content-Type": file.type,
    //             "X-File-Timestamp": mtime,
    //         },
    //         body: stream,
    //         signal,
    //         duplex: "half",
    //     });

    //     if (response.ok) {
    //         setTasks((prev) =>
    //             prev.map((task) =>
    //                 task.taskId === taskId
    //                     ? {
    //                           ...task,
    //                           status: "completed",
    //                           message: "",
    //                           done: true,
    //                           updateTime: Date.now(),
    //                       }
    //                     : task
    //             )
    //         );
    //         console.log("Upload: success");
    //         refresh();
    //     } else {
    //         const errorResponse = await response.json().catch(() => null);
    //         const stderr = errorResponse?.detail?.stderr;
    //         const message = stderr
    //             ? `Error: HTTP ${response.status}: ${response.statusText}, stderr=${stderr}`
    //             : `Error: HTTP ${response.status}: ${response.statusText}`;

    //         setTasks((prev) =>
    //             prev.map((task) =>
    //                 task.taskId === taskId
    //                     ? { ...task, status: "error", message, updateTime: Date.now() }
    //                     : task
    //             )
    //         );
    //         console.error(message);
    //         refresh();
    //     }
    // } catch (err) {
    //     const isAbort = err.name === "AbortError";
    //     const message = isAbort ? "Upload cancelled" : `${err.name}: ${err.message}`;

    //     setTasks((prev) =>
    //         prev.map((task) =>
    //             task.taskId === taskId
    //                 ? {
    //                       ...task,
    //                       status: isAbort ? "cancel" : "error",
    //                       message,
    //                       done: true,
    //                       updateTime: Date.now(),
    //                   }
    //                 : task
    //         )
    //     );
    //     console.error(message);
    //     refresh();
    // }
}

async function upload(currentDir, files, setTasks, refresh) {
    const dirSet = new Set();
    dirSet.add("/");
    for (const file of files) {
        await uploadFile(currentDir, file, dirSet, setTasks, refresh);
    }
}

export default upload;
