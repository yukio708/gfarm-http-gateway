import { encodePath } from "./func";
import { API_URL } from "./config";
import get_error_message from "./error";

async function getList(dirPath, showHidden) {
    const epath = encodePath(dirPath);
    const fullpath = `${API_URL}/dir${epath}?show_hidden=${showHidden ? "on" : "off"}&long_format=on&time_format=full&output_format=json`;
    try {
        const response = await fetch(fullpath, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }
        const data = await response.json();
        return data;
    } catch (err) {
        return `${err.name} : ${err.message}`;
    }
}

export default getList;
