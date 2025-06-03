import { API_URL } from '../utils/api_url';

function LoginPage () {
    const redirectTo = encodeURIComponent(window.location.hash) || "";
    window.location.href = `${API_URL}/login?redirect=${redirectTo}`;
}

export default LoginPage;