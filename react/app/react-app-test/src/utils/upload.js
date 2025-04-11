
async function upload(currentDir, files, setProgress, cancelRef) {
    if (!files) {
        alert('Please select a file');
        return;
    }
    for (let file of files) {
        const uploadUrl = '../file' + currentDir + '/' + file.name;
        const progress = {};
        console.log("uploadUrl: ", uploadUrl);
        try {
            const mtime = Math.floor(file.lastModified / 1000);  // msec. -> sec.
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.responseType = 'json';

            cancelRef.current = () => {
                xhr.abort();
                console.log('cancel');
            };

            xhr.setRequestHeader('Content-Type', file.type);
            xhr.setRequestHeader('X-File-Timestamp', mtime);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.floor((event.loaded / event.total) * 100);
                    const elapsedTime = Date.now() - startTime;  // msec.
                    const speed = Math.round(event.loaded / elapsedTime * 1000);
                    const sec = Math.floor(elapsedTime / 1000)
                    progress.value = percent;
                    progress.textContent = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                    setProgress(progress);
                    console.log('uploaded: %d / %d (%d %)', event.loaded, event.total, percent);
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progress.textContent = 'Success (' + currentDir + '/' + file.name + ')';
                    setProgress(progress);
                    //alert('Upload: success (' + dirPath + file.name + ')');
                    console.log('Upload: success');
                } else {
                    //console.error(xhr.response);
                    const stderr = JSON.stringify(xhr.response.detail.stderr);
                    if (stderr === undefined) {
                        progress.textContent = `Error: HTTP ${xhr.status}: ${xhr.statusText}, detail=${xhr.response.detail}`;
                    } else {
                        progress.textContent = `Error: HTTP ${xhr.status}: ${xhr.statusText}, stderr=${stderr}`;
                    }
                    setProgress(progress);
                    console.error(progress.textContent);
                }
            };
            xhr.onerror = () => {
                progress.textContent = 'Network error';
                setProgress(progress);
                console.error('Network error');
            };
            xhr.send(file);
        } catch (error) {
            alert('Cannot upload:' + error);
            console.error('Cannot upload:', error);
            throw error;
        }
    }
}

export default upload;