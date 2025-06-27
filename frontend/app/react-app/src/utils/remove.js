import { encodePath } from "./func";
import { API_URL } from "./config";

async function removeFile(path, isFile = true) {
    if (!path) {
        alert("Please input Gfarm path");
    }
    const epath = encodePath(path);
    try {
        const url = isFile
            ? `${API_URL}/file${epath}`
            : `${API_URL}/file${epath}?force=on&recursive=on`;
        console.debug("delete url", url);
        const response = await fetch(url, {
            method: "DELETE",
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        console.debug("Success (removed)");
        return null;
    } catch (error) {
        console.error(error);
        return error.message;
    }
}

export default async function removeFiles(files, refresh) {
    if (!files) {
        return;
    }

    for (const file of files) {
        const error = await removeFile(file.path, file.is_file);
        if (error) {
            return error;
        }
    }
    refresh();
}
