import { encodePath } from "./func";
import { API_URL } from "./api_url";

async function getSymlink(symlink) {
    const epath = encodePath(symlink);
    const fullpath = `${API_URL}/symlink${epath}`;
    const response = await fetch(fullpath);
    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

export default getSymlink;
