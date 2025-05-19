import { encodePath } from './func'
import { API_URL } from '../utils/api_url';

async function downloadFile(path, setTasks, zip=false) {
    console.log("download: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path)
    const dlurl = zip 
        ?`${API_URL}/download/zip/${path}`
        : `${API_URL}/file${epath}?action=download`;

    try{
        const startTime = Date.now();
        let filename = path.split("/").pop();
        const newTask = {
            path: path,
            name: filename,
            value: 0,
            status: 'downloading',
            onCancel: () => {
                xhr.abort();
                console.log('cancel:', path);
            },
            startTime: startTime,
        };
        setTasks(prev => [...prev, newTask]);

        const response = await fetch(dlurl);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const contentLength = response.headers.get("Content-Length");
        if (!contentLength) {
            console.log("Missing Content-Length header");
        }

        const total = parseInt(contentLength, 10);
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            const percent = Math.floor((received / total) * 100);
            const elapsed = Date.now() - startTime;
            const speed = Math.round(received / elapsed * 1000);
            const sec = Math.floor(elapsed / 1000);
            const status = `${percent} % | ${sec} sec | ${speed} bytes/sec`;

            setTasks((prev) =>
                prev.map((task) =>
                    task.path === path ? { ...task, value: percent, status } : task
                )
            );
        }

        const blob = new Blob(chunks);
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
                task.path === path ? { ...task, status: "done", value: 100 } : task
            )
        );

    } catch(err) {
        console.error("Download failed", err);
        setTasks((prev) =>
            prev.map((task) =>
                task.path === taskId
                    ? { ...task, status: `Error: ${err.message}` }
                    : task
            )
        );
    }
}

async function downloadFiles(paths, setTasks) {
    if (!paths || paths.length === 0) {
        alert("No file selected for download");
        return;
    }
    // Multiple files — request a zip from the server
    const url = `${API_URL}/download/zip`;
    const startTime = Date.now();
    const taskId = paths.join(",") + startTime;
    try {
        const newTask = {
            path: taskId,
            name: taskId,
            value: 0,
            status: "zipping...",
            onCancel: null,
            startTime: startTime,
        };
        setTasks(prev => [...prev, newTask]);
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: paths }),
        });
        if (!response.ok) {
            throw new Error(`ZIP creation failed: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let zip_path = null;
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split by newline (SSE format)
            const lines = buffer.split("\n\n");
            buffer = lines.pop(); // Keep the unfinished chunk

            for (const line of lines) {
                if (line.startsWith("data:")) {
                    try {
                        const data = JSON.parse(line.replace("data: ", ""));
                        if (data.progress) {
                            setTasks(prev =>
                                prev.map(task =>
                                    task.path === taskId ? { ...task, value: 0, status: data.progress } : task
                                )
                            );
                        }
                        if (data.zip_path) {
                            zip_path = data.zip_path;
                            console.log("zip_path", zip_path);
                            setTasks(prev =>
                                prev.map(task =>
                                    task.path === taskId ? { ...task, value: 100, status: 'zipped' } : task
                                )
                            );
                        }
                    } catch (err) {
                        console.error("Invalid SSE data", err);
                    }
                }
            }
        }

        if (zip_path === null) {
            throw new Error(`ZIP path is unknown`);
        }

        downloadFile(zip_path, setTasks, true);

    } catch (err) {
        console.error("ZIP download failed", err);
        setTasks(prev =>
            prev.map(task =>
                task.path === taskId
                    ? { ...task, status: `Error: ${err.message}` }
                    : task
            )
        );
    }
}

function getFilenameFromHeader(header) {
    const match = /filename="(.+?)"/.exec(header);
    return match ? match[1] : 'files.zip';
}

function getProgress(received, total) {
  if (!total || total === 0) return undefined;
  return Math.floor((received / total) * 100);
}

async function downloadFiles_w_stream(paths, setTasks) {
    if (!paths || paths.length === 0) {
        alert("No file selected for download");
        return;
    }
    // Multiple files — request a zip from the server
    const url = `${API_URL}/download/zip_w_stream`;
    const taskId = paths.join(",") + Date.now();

    try {
        console.log("paths", paths);
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: paths }),
        });

        if (!response.ok) {
            throw new Error(`ZIP creation failed: ${response.status}`);
        }

        const contentLength = response.headers.get("Content-Length");
        if (!contentLength) {
            console.log("Missing Content-Length header");
        }

        const total = parseInt(contentLength, 10);
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        const startTime = Date.now();
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = getFilenameFromHeader(contentDisposition);

        const newTask = {
            path: taskId,
            name: filename,
            value: 0,
            status: "zipping...",
            onCancel: null,
            startTime: startTime,
        };
        setTasks(prev => [...prev, newTask]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            const percent = getProgress(received, total);
            const elapsed = Date.now() - startTime;
            const speed = Math.round(received / elapsed * 1000);
            const sec = Math.floor(elapsed / 1000);
            const status = `${percent} % | ${sec} sec | ${speed} bytes/sec`;

            setTasks(prev =>
                prev.map(task =>
                    task.path === taskId ? { ...task, value: percent, status } : task
                )
            );
        }

        const blob = new Blob(chunks, { type: "application/zip" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);

        setTasks(prev =>
            prev.map(task =>
                task.path === taskId ? { ...task, status: "done", value: 100 } : task
            )
        );
    } catch (err) {
        console.error("ZIP download failed", err);
        setTasks(prev =>
            prev.map(task =>
                task.path === "zip:" + Date.now()
                    ? { ...task, status: `Error: ${err.message}` }
                    : task
            )
        );
    }
}

async function download(paths, setTasks) {
    if (!paths || paths.length === 0) {
        alert("No file selected for download");
        return;
    }

    if (paths.length === 1) {
        await downloadFile(paths[0], setTasks);
    }
    else{
        await downloadFiles(paths, setTasks);
        // await downloadFiles_w_stream(paths, setTasks);
    }
  
}

export default download;