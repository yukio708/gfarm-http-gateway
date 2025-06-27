import { encodePath } from "./func";
import { API_URL } from "./config";

async function getList(dirPath) {
    const epath = encodePath(dirPath);
    const fullpath = `${API_URL}/dir${epath}?show_hidden=on&long_format=on&time_format=full&output_format=json`;
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
