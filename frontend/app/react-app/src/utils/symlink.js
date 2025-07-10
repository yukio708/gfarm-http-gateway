import { encodePath } from "./func";
import { API_URL } from "./config";
import get_error_message from "./error";

async function getSymlink(symlink) {
    const epath = encodePath(symlink);
    const fullpath = `${API_URL}/symlink${epath}`;
    const response = await fetch(fullpath);
    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error.detail);
        throw new Error(message);
    }
    const data = await response.json();
    return data;
}

async function setSymlink(source, destination) {
    const fullpath = `${API_URL}/symlink`;
    const response = await fetch(fullpath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
    });
    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error.detail);
        throw new Error(message);
    }
    return "";
}

export { getSymlink, setSymlink };
