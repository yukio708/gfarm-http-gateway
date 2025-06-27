import { encodePath, getParentPath } from "./func";
import { createDir } from "./dircommon";
import { API_URL, PARALLEL_LIMIT } from "./config";

// file: file + File
async function uploadFile(file, fullpath, taskId, dirSet, setTasks) {
    if (!file) {
        alert("Please select a file");
        return;
    }
    const uploaddirpath = file.is_file ? getParentPath(file.destPath) : file.destPath;
    const startTime = Date.now();

    console.debug("uploaddirpath", uploaddirpath);
    console.debug("fullpath", fullpath);

    // createdir
    let createDirError = null;
    if (!dirSet.has(uploaddirpath)) {
        createDirError = await createDir(uploaddirpath, "p=on");
        dirSet.add(uploaddirpath);
        console.debug("dirSet", dirSet);
    }

    if (file.is_dir) {
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: createDirError ? "error" : "completed",
                          value: 100,
                          message: createDirError ? createDirError : "",
                          done: true,
                      }
                    : task
            )
        );

        return;
    }

    const epath = encodePath(fullpath);
    const uploadUrl = `${API_URL}/file` + epath;
    console.debug("uploadUrl:", uploadUrl);
    const mtime = Math.floor(file.file.lastModified / 1000); // msec. -> sec.

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
                                            }
                                          : task
                                  )
                              );
                              console.warn("cancel:", file.name);
                          },
                      }
                    : task
            )
        );

        xhr.setRequestHeader("Content-Type", file.file.type);
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
                        task.taskId === taskId ? { ...task, value, message } : task
                    )
                );
                console.debug("uploaded: %d / %d (%d %)", event.loaded, event.total, percent);
            }
        };
        return new Promise((resolve, reject) => {
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
                                  }
                                : task
                        )
                    );
                    console.debug("Upload: success");
                    resolve();
                } else {
                    const detail = xhr.response?.detail;
                    const stderr = detail?.stderr ? JSON.stringify(detail.stderr) : null;
                    const message = stderr
                        ? `Error: HTTP ${xhr.status}: ${xhr.statusText}, stderr=${stderr}`
                        : `Error: HTTP ${xhr.status}: ${xhr.statusText}, detail=${JSON.stringify(detail)}`;
                    setTasks((prev) =>
                        prev.map((task) =>
                            task.taskId === taskId ? { ...task, status: "error", message } : task
                        )
                    );
                    console.error(message);
                    reject(new Error(message));
                }
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
                              }
                            : task
                    )
                );
                console.error("Network error");
                reject(new Error("Network error"));
            };
            xhr.send(file.file);
        });
    } catch (error) {
        console.error("Cannot upload:", error);

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: "error",
                          message: error,
                          done: true,
                      }
                    : task
            )
        );
        return;
    }
}

async function runWithLimit(tasks, limit = 10) {
    const results = [];
    const queue = [];

    for (const task of tasks) {
        const p = task().then((result) => {
            queue.splice(queue.indexOf(p), 1);
            return result;
        });
        queue.push(p);
        results.push(p);

        if (queue.length >= limit) {
            await Promise.race(queue);
        }
    }

    return Promise.allSettled(results);
}

async function upload(files, setTasks) {
    const dirSet = new Set();
    dirSet.add("/");

    const tasks = files.map((file) => {
        const fullpath = file.destPath;
        const taskId = fullpath + Date.now();
        const displayname = file.path.length > 20 ? file.path.slice(0, 20) + "..." : file.path;

        const newTask = {
            taskId,
            name: displayname,
            value: 0,
            done: false,
            type: "upload",
            status: "uploading",
            message: "waiting to upload...",
            onCancel: () => {},
        };
        return { file, fullpath, taskId, task: newTask };
    });

    setTasks((prev) => [...prev, ...tasks.map((entry) => entry.task)]);

    const uploadFunctions = tasks.map(({ file, fullpath, taskId }) => {
        return () =>
            uploadFile(file, fullpath, taskId, dirSet, setTasks).catch((err) => {
                console.error("uploadFile failed:", err);
                // Don't re-throw — swallow the error to avoid crashing runWithLimit
            });
    });

    return runWithLimit(uploadFunctions, PARALLEL_LIMIT);
}

export default upload;
