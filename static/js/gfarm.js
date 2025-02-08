function encodePath(path) {
    let p = '/' + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
}

function basename(path) {
    return path.split("/").pop();
}

// not ANONYMOUS
async function whoamiWithoutAuth() {
    const whoamiURL4 = document.getElementById('whoami_url4');
    const whoamiOut4 = document.getElementById('whoami_out4');
    try {
        const url = whoamiURL4.value + "/c/me";
        const response = await fetch(
            url,
            {
                headers: {
                    'Authorization': 'Bearer ' + "DUMMY",
                }
            });
        const text = await response.text();
        whoamiOut4.textContent = text;
        //if (!response.ok) {
        //    throw new Error(`HTTP error: ${response.status}`);
        //}
    } catch (error) {
        console.error('Error fetching data:', error);
        whoamiOut4.textContent = error;
    }
}

async function downloadFile() {
    const progressBar = document.getElementById('download-progress');
    const progressText = document.getElementById('download-progress-text');
    const cancelButton = document.getElementById('download-cancel');
    let path = document.getElementById("export_path").value;
    if (path) {
        let filename = basename(path);
        const epath = encodePath(path)
        const dlurl = `/file${epath}?action=download`;
        try {
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            xhr.open('GET', dlurl);
            xhr.responseType = 'blob';

            cancelButton.addEventListener('click', function() {
                progressText.textContent = "Canceled";
                xhr.abort();
            });

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.floor((event.loaded / event.total) * 100);
                    const elapsedTime = Date.now() - startTime;  // msec.
                    const speed = Math.round(event.loaded / elapsedTime * 1000);
                    const sec = Math.floor(elapsedTime / 1000)
                    progressBar.value = percent;
                    progressText.textContent = `${event.loaded} / ${event.total} | ${percent} % | ${sec} sec | ${speed} bytes/sec)`;
                    console.log('downloaded: %d / %d (%d %)', event.loaded, event.total, percent);
                }
            };

            xhr.onload = () => {
                const contentDisposition = xhr.getResponseHeader('Content-Disposition');
                if (contentDisposition) {
                    // RFC 5987,8187
                    let fnMatch = contentDisposition.match(/filename\*=UTF-8\'\'([^"]+)/);
                    if (fnMatch) {
                        downloadedFilename = decodeURIComponent(fnMatch[1]);
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
                    progressText.textContent = `Error: HTTP ${xhr.status}: ${xhr.statusText}`;
                    console.error(progressText.textContent);
                }
            };

            xhr.onerror = () => {
                progressText.textContent = 'Network error';
                console.error('Network error');
            };

            xhr.send();

            // response = await fetch(requrl);
            // if (!response.ok) {
            //     const text = await response.text();
            //     throw new Error(`HTTP ${response.status}: ${text}`);
            // }
            // const contentDisposition = response.headers.get('Content-Disposition');
            // if (contentDisposition) {
            //     // RFC 5987,8187
            //     let fnMatch = contentDisposition.match(/filename\*=UTF-8\'\'([^"]+)/);
            //     if (fnMatch) {
            //         downloadedFilename = decodeURIComponent(fnMatch[1]);
            //     } else {
            //         const fnMatch = contentDisposition.match(/filename="([^"]+)"/);
            //         if (fnMatch) {
            //             filename = decodeURIComponent(fnMatch[1]);
            //         }
            //     }
            // }
            // blob = await response.blob();
            // const url = window.URL.createObjectURL(blob);
            // const a = document.createElement('a');
            // a.href = url;
            // a.setAttribute('download', filename);
            // a.style.display = 'none';
            // document.body.appendChild(a);
            // a.click();
            // document.body.removeChild(a);
            // window.URL.revokeObjectURL(url);
        } catch(error) {
            alert("Error: " + error.message);
            console.error(error);
        };
    } else {
        alert("Please input Gfarm path");
    }
}
