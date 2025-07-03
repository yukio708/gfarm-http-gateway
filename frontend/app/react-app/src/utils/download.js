import { encodePath } from "./func";
import { API_URL } from "../utils/config";

async function downloadFile(dlurl, defaultFilename, request, setError) {
    let filename = defaultFilename;

    try {
        const response = await fetch(dlurl, request);

        console.debug("response", response);
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error("Download failed", err);
        setError(`${err.name}: ${err.message}`);
    }
}

async function download(files, setError) {
    if (!files || files.length === 0) {
        setError("No file selected for download");
        return;
    }

    console.debug("download:", files);

    if (files.length === 1 && files[0].is_file) {
        const epath = encodePath(files[0].path);
        const dlurl = `${API_URL}/file${epath}?action=download`;
        const filename = files[0].path.split("/").pop();
        await downloadFile(dlurl, filename, {}, setError);
    } else {
        const dlurl = `${API_URL}/zip`;
        const filename = "tmp" + Date.now() + ".zip";
        const pathes = files.map((file) => file.path);
        console.debug("pathes", pathes);
        const request = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pathes }),
        };
        await downloadFile(dlurl, filename, request, setError);
    }
}

export default download;
