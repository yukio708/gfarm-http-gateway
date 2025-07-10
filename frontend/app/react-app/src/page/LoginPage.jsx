import { API_URL, ROUTE_STORAGE, ROUTE_DOWNLOAD } from "../utils/config";

function LoginPage() {
    const location = window.location.href;
    const storage_path = `${window.location.origin}${window.location.pathname}#${ROUTE_STORAGE}`;
    const download_path = `${window.location.origin}${window.location.pathname}#${ROUTE_DOWNLOAD}`;
    console.debug("location", location);
    if (location === storage_path) {
        window.location.href = `${API_URL}/login`;
    } else if (location.startsWith(storage_path) || location.startsWith(download_path)) {
        const redirectTo = encodeURIComponent(location) || "";
        window.location.href = `${API_URL}/login?redirect=${redirectTo}`;
    } else {
        window.location.href = `${API_URL}/login`;
    }
}

export default LoginPage;
