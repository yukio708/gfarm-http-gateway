import { encodePath } from "./func";
import { API_URL } from "./api_url";

async function getAttribute(filepath) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}`;
    try {
        const response = await fetch(fullpath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.text()}`);
        }
        const json = await response.json();
        return json;
    } catch (error) {
        console.error("Fetch error: ", error);
        return null;
    }
}

export default getAttribute;
