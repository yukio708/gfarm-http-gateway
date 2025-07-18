import { encodePath } from "./func";
import { API_URL } from "./config";
import get_error_message from "./error";

async function getAttribute(filepath, cksum) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}?check_sum=${cksum ? "on" : "off"}`;

    const response = await fetch(fullpath, {
        credentials: "include",
    });
    const json = await response.json();
    if (!response.ok) {
        const message = get_error_message(response.status, json.detail);
        throw new Error(message);
    }
    return json;
}

export default getAttribute;
