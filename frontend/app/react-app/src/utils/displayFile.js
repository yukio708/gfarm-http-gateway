import { encodePath } from './func'
import { API_URL } from './api_url';

function displayFile(path) {
    console.log("displayFile: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path);
    const url = `${API_URL}/file${epath}`;
    window.open(url, '_blank');
}

export default displayFile;