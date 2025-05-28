import { encodePath } from './func'
import { API_URL } from '../utils/api_url';

async function downloadFile(path, setTasks) {
    console.log("download: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path)
    const dlurl = `${API_URL}/file${epath}?action=download`;

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
            updateTime: Date.now()
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
                    task.path === path ? { ...task, value: percent, status, updateTime: Date.now() } : task
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
                task.path === path ? { ...task, status: "done", value: 100, done: true, updateTime: Date.now() } : task
            )
        );

    } catch(err) {
        console.error("Download failed", err);
        setTasks((prev) =>
            prev.map((task) =>
                task.path === taskId
                    ? { ...task, status: `Error: ${err.message}`, done: true, updateTime: Date.now() }
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

async function downloadFiles(paths, setTasks) {
        console.log("paths", paths);
    if (!paths || paths.length === 0) {
        alert("No file selected for download");
        return;
    }
    // Multiple files — request a zip from the server
    const url = `${API_URL}/download/zip`;
    const taskId = paths.join(",") + Date.now();
    const gfarmpathes = paths.map(path => "gfarm:" + path)

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: gfarmpathes }),
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
            done: false,
            status: "zipping...",
            onCancel: null,
            startTime: startTime,
            updateTime: Date.now()
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
                    task.path === taskId ? { ...task, value: percent, status, updateTime: Date.now() } : task
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
                task.path === taskId ? { ...task, status: "done", done: true, value: 100, updateTime: Date.now() } : task
            )
        );
    } catch (err) {
        console.error("ZIP download failed", err);
        setTasks(prev =>
            prev.map(task =>
                task.path === "zip:" + Date.now()
                    ? { ...task, status: `Error: ${err.message}`, done: true, updateTime: Date.now() }
                    : task
            )
        );
    }
}

async function download(files, setTasks) {
    if (!files || files.length === 0) {
        alert("No file selected for download");
        return;
    }

    if (files.length === 1 && files[0].isfile) {
        await downloadFile(files[0].path, setTasks);
    }
    else{
        await downloadFiles(files.map(file => file.path), setTasks);
    }
  
}

export default download;