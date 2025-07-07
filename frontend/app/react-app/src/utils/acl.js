import { encodePath } from "./func";
import { API_URL } from "./config";

export async function set_acl(path, acl) {
    const epath = encodePath(path);
    const fullpath = `${API_URL}/acl${epath}`;
    try {
        const response = await fetch(fullpath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acl }),
        });
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }
        return "";
    } catch (err) {
        return err.message;
    }
}

export async function get_acl(path) {
    const epath = encodePath(path);
    const fullpath = `${API_URL}/acl${epath}`;
    try {
        const response = await fetch(fullpath);
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }
        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
}
