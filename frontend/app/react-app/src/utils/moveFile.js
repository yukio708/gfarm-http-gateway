import { encodePath } from './func'
import { API_URL } from './api_url';

async function moveFile(files, dest) {
    if (!files || !dest) {
        alert("Please input Gfarm path");
    }
    for (const src of files) {
        const data = JSON.stringify({
            "source": src.path,
            "destination": dest,
        }, null, 2);

        try {
            const url = `${API_URL}/move`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: data
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            console.log(`Success (moved)`);
        } catch (error) {
            console.error(error);
        }
    }
}

export default moveFile;