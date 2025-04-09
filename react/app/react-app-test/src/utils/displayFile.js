import { encodePath } from './func'

function displayFile(path) {
    console.log("displayFile: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path);
    const url = `./file${epath}`;
    window.open(url, '_blank');
}

export default displayFile;