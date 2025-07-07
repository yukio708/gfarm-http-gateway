import { encodePath } from "./func";
import { API_URL } from "./config";

async function getSymlink(symlink) {
    const epath = encodePath(symlink);
    const fullpath = `${API_URL}/symlink${epath}`;
    const response = await fetch(fullpath);
    if (!response.ok) {
        const error = await response.json();
        const message = JSON.stringify(error.detail);
        throw new Error(`${response.status} ${message}`);
    }
    const data = await response.json();
    return data;
}

export default getSymlink;
