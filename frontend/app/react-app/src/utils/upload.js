import { encodePath, getParentPath } from "@utils/func";
import { createDir } from "@utils/dircommon";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

// file: file + File
// progressCallbeck({status, value, message, done, onCancel})
async function upload(file, fullpath, dirSet, progressCallbeck) {
    if (!file) {
        alert("Please select a file");
        return;
    }
    const uploaddirpath = file.is_file ? getParentPath(file.destPath) : file.destPath;
    const startTime = Date.now();

    // console.debug("uploaddirpath", uploaddirpath);
    // console.debug("fullpath", fullpath);

    // createdir
    let createDirError = null;
    if (!dirSet.has(uploaddirpath)) {
        createDirError = await createDir(uploaddirpath, "p=on");
        dirSet.add(uploaddirpath);
        // console.debug("dirSet", dirSet);
    }

    if (createDirError) {
        progressCallbeck({
            status: createDirError ? "error" : "completed",
            value: 100,
            message: createDirError ? createDirError : "",
            done: true,
        });

        return;
    }

    const epath = encodePath(fullpath);
    const uploadUrl = `${API_URL}/file` + epath;
    // console.debug("uploadUrl:", uploadUrl);

    try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.withCredentials = true;
        xhr.responseType = "json";

        progressCallbeck({
            onCancel: () => {
                xhr.abort();
                progressCallbeck({
                    status: "cancelled",
                    message: "Upload cancelled",
                    done: true,
                });
                console.warn("cancel:", file.name);
            },
        });

        xhr.setRequestHeader("Content-Type", file.file.type);
        xhr.setRequestHeader("X-File-Timestamp", file.mtime);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime; // msec.
                const speed = Math.round((event.loaded / elapsedTime) * 1000);
                const sec = Math.floor(elapsedTime / 1000);
                const value = percent;
                const message = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                progressCallbeck({ value, message });
                // console.debug("uploaded: %d / %d (%d %)", event.loaded, event.total, percent);
            }
        };
        return new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progressCallbeck({
                        status: "completed",
                        value: 100,
                        message: "",
                        done: true,
                    });
                    console.debug("Upload: success");
                    resolve();
                } else {
                    const detail = xhr.response?.detail;
                    const message = "Error : " + get_error_message(xhr.status, detail);
                    progressCallbeck({
                        status: "error",
                        message,
                        done: true,
                    });
                    console.error("!!!", message);
                    reject(new Error(message));
                }
            };
            xhr.onerror = () => {
                progressCallbeck({
                    status: "error",
                    message: "Network error",
                    done: true,
                });
                reject(new Error("Network error"));
            };
            xhr.send(file.file);
        });
    } catch (error) {
        console.error("Cannot upload:", error);
        const message = `${error.name} : ${error.message}`;
        progressCallbeck({
            status: "error",
            message,
            done: true,
        });
        return;
    }
}

async function checkPermissoin(uploaddir) {
    const epath = encodePath(uploaddir);
    const fullpath = `${API_URL}/dir${epath}?show_hidden=on&effperm=on`;
    let error = null;
    try {
        const response = await fetch(fullpath, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }
        const data = await response.json();
        if (data[0].perms.includes("w")) {
            console.debug("permission check", uploaddir, data[0].perms.includes("w"));
        } else {
            const message = get_error_message(403, `Permission denied : ${uploaddir}`);
            throw new Error(message);
        }
    } catch (err) {
        error = `${err.name}: ${err.message}`;
    }
    return error;
}

export { upload, checkPermissoin };
