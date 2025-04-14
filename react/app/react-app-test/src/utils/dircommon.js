import { encodePath } from './func'

async function dirCommon(path, method, message) {
    if (path) {
        const epath = encodePath(path);
        try {
            const url = `./dir${epath}`
            const response = await fetch(url, {
                method: method
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            console.log(`dirCommon: Success (${message})`);
        } catch (error) {
            console.error(error);
            console.log(`dirCommon: ${error}`);
        }
    } else {
        alert("Please input Gfarm path");
    }
}

export async function createDir(path) {
    await dirCommon(path, "PUT", "created");
}

export async function removeDir(path) {
    await dirCommon(path, "DELETE", "removed");
}