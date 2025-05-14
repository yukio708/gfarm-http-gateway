import { API_URL } from './api_url';

async function checkLoginStatus() {
    try {
        const res = await fetch(`${API_URL}/c/me`, { credentials: "include" });
        if (!res.ok) throw new Error("not logged in");
        const data = await res.text();
        return data;
    } catch (err) {
        console.error("Error fetching /c/me:", err);
        return null;
    }
}

export default checkLoginStatus;