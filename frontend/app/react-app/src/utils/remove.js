import { encodePath } from "./func";
import { API_URL } from "./config";

async function removeItem(path, isFile = true) {
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
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }
        console.debug("Success (removed)");
        return null;
    } catch (error) {
        console.error(error);
        return `${error.name} : ${error.message}`;
    }
}

export default async function removeItems(files, refresh) {
    if (!files) {
        return null;
    }

    for (const file of files) {
        const error = await removeItem(file.path, file.is_file);
        if (error) {
            return error;
        }
    }
    refresh();
    return null;
}
