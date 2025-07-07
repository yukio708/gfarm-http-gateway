import { encodePath } from "./func";
import { API_URL } from "./config";

async function changeMode(path, mode) {
    if (!path) {
        return "path is empty";
    }

    const epath = encodePath(path);
    const url = `${API_URL}/attr${epath}`;

    const data = JSON.stringify(
        {
            Mode: mode,
        },
        null,
        2
    );

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: data,
        });
        if (!response.ok) {
            const error = await response.json();
            const message = JSON.stringify(error.detail);
            throw new Error(`${response.status} ${message}`);
        }
    } catch (error) {
        console.error(error);
        return error.message;
    }
    return null;
}

export default changeMode;
