import React from 'react';
import { encodePath } from './func'

async function download(path, setProgress, setXhrInstance) {
    console.log("download: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path)
    const dlurl = `../file${epath}?action=download`;
    const progress = {};

    try{
        let filename = path.split("/").pop();
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        setXhrInstance(xhr);
        xhr.open('GET', dlurl);
        xhr.responseType = 'blob';

        // cancelButton.addEventListener('click', function() {
        //     progressText.textContent = "Canceled";
        //     xhr.abort();
        // });

        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime;  // msec.
                const speed = Math.round(event.loaded / elapsedTime * 1000);
                const sec = Math.floor(elapsedTime / 1000)
                progress.value = percent;
                progress.textContent = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                setProgress(progress);
                console.log('downloaded: %d / %d (%d %)', event.loaded, event.total, percent);
            }
        };

        xhr.onload = () => {
            const contentDisposition = xhr.getResponseHeader('Content-Disposition');
            if (contentDisposition) {
                // RFC 5987,8187
                let fnMatch = contentDisposition.match(/filename\*=UTF-8\'\'([^"]+)/);
                if (fnMatch) {
                    const downloadedFilename = decodeURIComponent(fnMatch[1]);
                } else {
                    const fnMatch = contentDisposition.match(/filename="([^"]+)"/);
                    if (fnMatch) {
                        filename = decodeURIComponent(fnMatch[1]);
                    }
                }
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                const blob = xhr.response;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                progress.textContent = `Error: HTTP ${xhr.status}: ${xhr.statusText}`;
                console.error(progress.textContent);
            }
            setXhrInstance(null);
        };
        
        xhr.onerror = () => {
            progress.textContent = 'Network error';
            console.error('Network error');
            setXhrInstance(null);
        };

        xhr.send();

    } catch(error) {
        alert("Error: " + error.message);
        console.error(error);
        setXhrInstance(null);
    }
}

export default download;