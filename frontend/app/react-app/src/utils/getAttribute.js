import { encodePath } from "./func";
import { API_URL } from "./config";

async function getAttribute(filepath) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}`;

    const response = await fetch(fullpath);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.text()}`);
    }
    const json = await response.json();
    return json;
}

export default getAttribute;
