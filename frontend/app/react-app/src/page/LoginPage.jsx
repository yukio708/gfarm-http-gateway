import { API_URL } from "../utils/config";

function LoginPage() {
    const location = window.location.href;
    console.debug("location", location);
    if (location.includes("#")) {
        const redirectTo = encodeURIComponent(location) || "";
        window.location.href = `${API_URL}/login?redirect=${redirectTo}`;
    } else {
        window.location.href = `${API_URL}/login`;
    }
}

export default LoginPage;
