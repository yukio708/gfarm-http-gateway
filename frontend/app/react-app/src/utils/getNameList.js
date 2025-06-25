import { API_URL } from "./api_url";

const cachedUsers = { users: [], lastFetch: 0 };
const cachedGroups = { groups: [], lastFetch: 0 };

const FETCH_INTERVAL = parseInt(import.meta.VITE_API_CHACE_AGE) || 60000;

export async function getUsers() {
    const now = Date.now();
    if (now - cachedUsers.lastFetch > FETCH_INTERVAL) {
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            if (data.list) {
                cachedUsers.users = data.list;
            }
            cachedUsers.lastFetch = now;
            console.log("data", data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    }
    return cachedUsers.users;
}

export async function getGroups() {
    const now = Date.now();
    if (now - cachedGroups.lastFetch > FETCH_INTERVAL) {
        try {
            const res = await fetch(`${API_URL}/groups`);
            const data = await res.json();
            if (data.list) {
                cachedGroups.groups = data.list;
            }
            cachedGroups.lastFetch = now;
        } catch (err) {
            console.error("Failed to fetch groups:", err);
        }
    }
    return cachedGroups.groups;
}
