import { encodePath } from './func';
import { API_URL } from './api_url';
import { removeDir } from './dircommon';

async function removeFile(path, params) {
    if (!path) {
        alert("Please input Gfarm path");
    }
    const epath = encodePath(path);
    try {
        const url = `${API_URL}/file${epath}`
        const response = await fetch(url, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        console.log("Success (removed)");
    } catch (error) {
        console.error(error);
    }
}

export default async function deleteFiles(files, params, refresh) {
    if (!files){
        return;
    }
    
    for (const file of files ) {
        if (file.isfile) {
            await removeFile(file.path, params);
        } else {
            await removeDir(file.path);
        }
    }
    refresh();
}