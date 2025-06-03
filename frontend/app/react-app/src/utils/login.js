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

export async function login_with_password(formData, current_path) {
    try {
        const res = await fetch(`${API_URL}/login_passwd?redirect=${encodeURIComponent(current_path)}`, {
            method: "POST",
            body: formData,
            credentials: "include",
        });
        // if (!res.ok) throw new Error("login failed");
        return true;

    } catch (err) {
        console.error("Error fetching /login_passwd:", err);
        return null;
    }
}