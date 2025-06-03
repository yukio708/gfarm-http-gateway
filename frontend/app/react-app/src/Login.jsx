import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from './utils/api_url';
import { login_with_password } from './utils/login';

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const keycloakRedirectUrl = `${API_URL}/login_oidc?redirect=${encodeURIComponent(window.location.hash)}`

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("csrf_token", "");
    const res = await login_with_password(formData, window.location.hash);
    if (res === null){
        setError("Login failed. Please try again.");
    } else {
        onLogin?.();
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
        <div className="card shadow-sm p-4" style={{ maxWidth: "400px", width: "100%" }}>
            <h2 id='title' className="mb-4 text-center">Login</h2>
            {error && (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
            )}

            <button
                className="btn btn-info"
                onClick={() => window.location.href = keycloakRedirectUrl}>
                Login with OpenID provider
            </button>

            <hr className="my-4" />

            <form onSubmit={handleSubmit}>
            <div className="mb-3">
                <label htmlFor="username" className="form-label">
                Username
                </label>
                <input
                type="text"
                className="form-control"
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="password" className="form-label">
                Password
                </label>
                <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                />
            </div>
            <button type="submit" className="btn btn-primary w-100">
                Login
            </button>
            </form>
        </div>
    </div>
  );
}

export default Login;