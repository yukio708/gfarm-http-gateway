import { encodePath } from "./func";
import { API_URL } from "./api_url";

async function upload(currentDir, file, setTasks, refresh) {
    if (!file) {
        alert("Please select a file");
        return;
    }
    const fullpath = currentDir + "/" + file.dirPath + file.name;
    const epath = encodePath(fullpath);
    const uploadUrl = `${API_URL}/file` + epath;
    const taskId = fullpath + Date.now();
    console.log("uploadUrl:", uploadUrl);

    try {
        const mtime = Math.floor(file.lastModified / 1000); // msec. -> sec.
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.responseType = "json";

        const newTask = {
            taskId,
            name: file.name,
            value: 0,
            done: false,
            status: "uploading",
            message: "",
            onCancel: () => {
                xhr.abort();
                console.log("cancel:", file);
            },
            startTime: startTime,
            updateTime: Date.now(),
        };
        setTasks((prev) => [...prev, newTask]);

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
                refresh();
            } else {
                //console.error(xhr.response);
                const stderr = JSON.stringify(xhr.response.detail.stderr);
                let message = "";
                if (stderr === undefined) {
                    message = `Error: HTTP ${xhr.status}: ${xhr.statusText}, detail=${xhr.response.detail}`;
                } else {
                    message = `Error: HTTP ${xhr.status}: ${xhr.statusText}, stderr=${stderr}`;
                }
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? { ...task, status: "error", message, updateTime: Date.now() }
                            : task
                    )
                );
                console.error(message);
                refresh();
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
                              updateTime: Date.now(),
                          }
                        : task
                )
            );
            console.error("Network error");
            refresh();
        };
        xhr.send(file);
    } catch (error) {
        alert("Cannot upload:" + error);
        console.error("Cannot upload:", error);
        throw error;
    }
}

export default upload;
