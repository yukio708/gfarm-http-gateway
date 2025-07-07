import { encodePath } from "./func";
import { API_URL } from "./config";

function displayFile(path, self = false) {
    if (!path) {
        console.error("path is empty");
        return "path is empty";
    }
    const epath = encodePath(path);
    const url = `${API_URL}/file${epath}`;
    window.open(url, self ? "_self" : "_blank");
    console.debug("displayFile: url:", url);
}

export default displayFile;
