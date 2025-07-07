import { encodePath } from "./func";
import { API_URL } from "../utils/config";

async function download(files, setError) {
    if (!files || files.length === 0) {
        setError("No file selected for download");
        return;
    }

    console.debug("download:", files);

    if (files.length === 1 && files[0].is_file) {
        const epath = encodePath(files[0].path);
        const dlurl = `${API_URL}/file${epath}?action=download`;
        const filename = files[0].path.split("/").pop();
        const a = document.createElement("a");
        a.href = dlurl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(dlurl);
    } else {
        const dlurl = `${API_URL}/zip`;
        const pathes = files.map((file) => file.path);
        console.debug("pathes", pathes);

        const form = document.createElement("form");
        form.action = dlurl;
        form.method = "POST";
        form.style.display = "none";

        for (const path of pathes) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "pathes";
            input.value = path;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();

        setTimeout(() => {
            form.remove();
        }, 100);
    }
}

export default download;
