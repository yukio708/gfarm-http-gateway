import { API_URL } from './api_url';

export async function checkLoginStatus() {
    try {
        const res = await fetch(`${API_URL}/c/me`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("not logged in");
        const data = await res.text();
        return data;
    } catch (err) {
        console.error("Error fetching /c/me:", err);
        return null;
    }
}

export async function login_with_password(formData) {
    try {
        const res = await fetch(`${API_URL}/login_passwd`, {
            method: "POST",
            body: formData,
            credentials: "include",
        });
        if (!res.ok) throw new Error("login failed");
        const data = await res.json();
        return data;

    } catch (err) {
        console.error("Error fetching /c/me:", err);
        return null;
    }
}