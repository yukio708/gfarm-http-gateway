import { encodePath } from "./func";
import { API_URL } from "./api_url";

async function dirCommon(path, method, message, params = null) {
    if (path) {
        const epath = encodePath(path);
        try {
            const url = `${API_URL}/dir${epath}?${params || ""}`;
            const response = await fetch(url, {
                method: method,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            console.debug(`dirCommon: Success (${message})`);
            return null;
        } catch (error) {
            console.error(error);
            console.debug(`dirCommon: ${error}`);
            return error.message;
        }
    } else {
        alert("Please input Gfarm path");
    }
}

export async function createDir(path, params) {
    return await dirCommon(path, "PUT", "created", params);
}

export async function removeDir(path) {
    return await dirCommon(path, "DELETE", "removed");
}
