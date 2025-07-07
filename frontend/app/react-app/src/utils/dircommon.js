import { encodePath } from "./func";
import { API_URL } from "./config";

async function dirCommon(path, method, message, params = null) {
    if (!path) {
        return "path is empty";
    }
    const epath = encodePath(path);
    try {
        const url = `${API_URL}/dir${epath}?${params || ""}`;
        const response = await fetch(url, {
            method: method,
        });
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`HTTP ${response.status}: ${message}`);
        }
        console.debug(`dirCommon: Success (${message})`);
        return null;
    } catch (error) {
        console.error(error);
        console.debug(`dirCommon: ${error}`);
        return `${error.name} : ${error.message}`;
    }
}

export async function createDir(path, params = null) {
    console.debug("createDir:", path);

    return await dirCommon(path, "PUT", "created", params);
}

export async function removeDir(path) {
    console.debug("removeDir:", path);
    return await dirCommon(path, "DELETE", "removed");
}
