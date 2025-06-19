import { API_URL } from "./api_url";

async function moveFile(files, refresh) {
    if (!files) {
        alert("Please input Gfarm path");
    }
    let res = "";
    for (const file of files) {
        console.debug("moveFile", file.path, "to", file.destPath);
        const data = JSON.stringify(
            {
                source: file.path,
                destination: file.destPath,
            },
            null,
            2
        );

        try {
            const url = `${API_URL}/move`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: data,
            });
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            console.debug(`Success (moved)`, text);
        } catch (error) {
            console.error(error);
            res = error;
        }
    }
    refresh();
    return res;
}

export default moveFile;
