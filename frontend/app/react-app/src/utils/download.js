import { encodePath } from './func'
import { API_URL } from '../utils/api_url';

async function download(path, setTasks) {
    console.log("download: filepath:", path);
    if (!path) {
        alert('Please input Gfarm path');
        return;
    }
    const epath = encodePath(path)
    const dlurl = `${API_URL}/file${epath}?action=download`;

    try{
        let filename = path.split("/").pop();
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', dlurl);
        xhr.responseType = 'blob';

        const newTask = {
            path: path,
            name: filename,
            value: 0,
            status: 'downloading',
            onCancel: () => {
                xhr.abort();
                console.log('cancel:', path);
            }
        };
        setTasks(prev => [...prev, newTask]);

        // cancelButton.addEventListener('click', function() {
        //     progressText.status = "Canceled";
        //     xhr.abort();
        // });

        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime;  // msec.
                const speed = Math.round(event.loaded / elapsedTime * 1000);
                const sec = Math.floor(elapsedTime / 1000)
                const value = percent;
                const status = `${percent} % | ${sec} sec | ${speed} bytes/sec`;
                setTasks( prev =>
                    prev.map(task =>
                        task.path === path ? { ...task, value, status } : task
                    )
                );
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
                const status = `Error: HTTP ${xhr.status}: ${xhr.statusText}`;
                setTasks( prev =>
                    prev.map(task =>
                        task.path === path ? { ...task, status } : task
                    )
                );
                console.error(status);
            }
        };
        
        xhr.onerror = () => {
            setTasks( prev =>
                prev.map(task =>
                    task.path === path ? { ...task, status:'Network error' } : task
                )
            );
            console.error('Network error');
        };

        xhr.send();

    } catch(error) {
        alert("Error: " + error.message);
        console.error(error);
    }
}

export default download;