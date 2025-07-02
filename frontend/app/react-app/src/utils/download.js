import { encodePath } from "./func";
import { API_URL } from "../utils/config";

function getFilenameFromHeader(header) {
    console.debug("header", header);
    const match = /filename="(.+?)"/.exec(header);
    return match ? match[1] : null;
}

function getProgress(received, total) {
    if (!total || total === 0) return undefined;
    return Math.floor((received / total) * 100);
}

async function downloadFile(dlurl, defaultFilename, controller, request, setTasks) {
    let filename = defaultFilename;
    const taskId = filename + Date.now();
    const displayname = filename.length > 20 ? filename.slice(0, 10) + "..." : filename;

    const startTime = Date.now();
    const newTask = {
        taskId,
        name: displayname,
        value: 0,
        type: "download",
        status: "download",
        message: "",
        onCancel: () => {
            controller.abort();
            console.debug("cancel:", filename);
        },
    };
    setTasks((prev) => [...prev, newTask]);

    try {
        const response = await fetch(dlurl, request);

        console.debug("response", response);
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }

        const contentType = response.headers.get("Content-Type");
        const contentLength = response.headers.get("Content-Length");
        if (!contentLength) {
            console.debug("Missing Content-Length header");
        }

        const total = parseInt(contentLength, 10);
        const reader = response.body.getReader();
        const chunks = [];
        const contentDisposition = response.headers.get("Content-Disposition");
        const headername = getFilenameFromHeader(contentDisposition);
        if (headername) {
            filename = headername;
            setTasks((prev) =>
                prev.map((task) => (task.taskId === taskId ? { ...task, name: filename } : task))
            );
            console.debug("filename", filename);
        }
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            const percent = getProgress(received, total);
            const elapsed = Date.now() - startTime;
            const speed = Math.round((received / elapsed) * 1000);
            const sec = Math.floor(elapsed / 1000);
            const message = percent
                ? `${percent} % | ${sec} sec | ${speed} bytes/sec`
                : `${sec} sec | ${speed} bytes/sec`;

            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId ? { ...task, value: percent, message } : task
                )
            );
        }

        const blob = new Blob(chunks, { type: contentType });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: "completed",
                          message: "",
                          value: 100,
                          done: true,
                      }
                    : task
            )
        );
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Download cancelled" : `${err.name}: ${err.message}`;
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? {
                          ...task,
                          status: isAbort ? "cancelled" : "error",
                          message,
                          done: true,
                      }
                    : task
            )
        );
        if (isAbort) {
            console.warn("Download cancelled", err);
        } else {
            console.error("Download failed", err);
        }
    }
}

async function download(files, setTasks) {
    if (!files || files.length === 0) {
        alert("No file selected for download");
        return;
    }

    console.debug("download:", files);

    const controller = new AbortController();
    const signal = controller.signal;
    if (files.length === 1 && files[0].is_file) {
        const epath = encodePath(files[0].path);
        const dlurl = `${API_URL}/file${epath}?action=download`;
        const filename = files[0].path.split("/").pop();
        const request = { signal };
        await downloadFile(dlurl, filename, controller, request, setTasks);
    } else {
        const dlurl = `${API_URL}/zip`;
        const filename = "tmp" + Date.now() + ".zip";
        const pathes = files.map((file) => file.path);
        console.log("pathes", pathes);
        const request = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pathes }),
            signal,
        };
        await downloadFile(dlurl, filename, controller, request, setTasks);
    }
}

export default download;
