import { encodePath } from './func'
import { API_URL } from './api_url';

async function upload(currentDir, file, setTasks) {
    if (!file) {
        alert('Please select a file');
        return;
    }
    const fullpath = currentDir + '/' + file.dirPath + file.name;
    const epath = encodePath(fullpath);
    const uploadUrl = `${API_URL}/file` + epath;
    console.log("uploadUrl:", uploadUrl);

    try {
        const mtime = Math.floor(file.lastModified / 1000);  // msec. -> sec.
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.responseType = 'json';
        
        const newTask = {
            path: fullpath,
            name: file.name,
            value: 0,
            status: 'uploading',
            onCancel: () => {
                xhr.abort();
                console.log('cancel:', file);
            }
        };
        setTasks(prev => [...prev, newTask]);

        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('X-File-Timestamp', mtime);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime;  // msec.
                const speed = Math.round(event.loaded / elapsedTime * 1000);
                const sec = Math.floor(elapsedTime / 1000)
                const value = percent;
                const status = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                setTasks( prev =>
                    prev.map(task =>
                        task.path === fullpath ? { ...task, value, status } : task
                    )
                );
                console.log('uploaded: %d / %d (%d %)', event.loaded, event.total, percent);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const status = 'Success (' + file.dirPath + file.name + ')';
                setTasks( prev =>
                    prev.map(task =>
                        task.path === fullpath ? { ...task, status } : task
                    )
                );
                console.log('Upload: success');
            } else {
                //console.error(xhr.response);
                const stderr = JSON.stringify(xhr.response.detail.stderr);
                let status = "";
                if (stderr === undefined) {
                    status = `Error: HTTP ${xhr.status}: ${xhr.statusText}, detail=${xhr.response.detail}`;
                } else {
                    status = `Error: HTTP ${xhr.status}: ${xhr.statusText}, stderr=${stderr}`;
                }
                setTasks( prev =>
                    prev.map(task =>
                        task.path === fullpath ? { ...task, status } : task
                    )
                );
                console.error(status);
            }
        };
        xhr.onerror = () => {
            setTasks( prev =>
                prev.map(task =>
                    task.path === fullpath ? { ...task, status:'Network error' } : task
                )
            );
            console.error('Network error');
        };
        xhr.send(file);
    } catch (error) {
        alert('Cannot upload:' + error);
        console.error('Cannot upload:', error);
        throw error;
    }
}

export default upload;