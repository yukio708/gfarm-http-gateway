import { encodePath } from "./func";
import { API_URL } from "./config";

async function getAttribute(filepath) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}`;

    const response = await fetch(fullpath);
    const json = await response.json();
    if (!response.ok) {
        const message = JSON.stringify(json.detail);
        throw new Error(`${response.status} ${message}`);
    }
    return json;
}

export default getAttribute;
