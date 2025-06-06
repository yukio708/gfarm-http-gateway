import { encodePath } from "./func";
import { API_URL } from "./api_url";

async function getList(dirPath) {
    const epath = encodePath(dirPath);
    const fullpath = `${API_URL}/d${epath}?a=on&l=on&format_type=json`;
    try {
        const response = await fetch(fullpath);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (err) {
        return "Failed to fetch " + dirPath + " : " + err.message;
    }
}

export default getList;
