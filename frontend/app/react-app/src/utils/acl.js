import { encodePath } from "./func";
import { API_URL } from "./api_url";

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
            throw new Error(`Error: ${response.status}`);
        }
        return "";
    } catch (err) {
        return "Failed to set ACL for " + path + " : " + err.message;
    }
}

export async function get_acl(path) {
    const epath = encodePath(path);
    const fullpath = `${API_URL}/acl${epath}`;
    try {
        const response = await fetch(fullpath);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        return { data: null, error: "Failed to get ACL for " + path + " : " + err.message };
    }
}
