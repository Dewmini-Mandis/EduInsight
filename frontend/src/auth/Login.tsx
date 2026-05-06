
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/accounts/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="login-root">
      <div className="login-left-panel">
        <div className="login-left-content">
          <h1 className="login-title">Empowering Education Through Data Insights.</h1>
          <p className="login-desc">
            Access real-time analytics and monitoring tools designed for the Sri Lankan Ministry of Education. Secure, reliable, and authoritative data management for a brighter pedagogical future.
          </p>
          <div className="login-feature-row">
            <div className="login-feature">
              <div className="login-feature-icon secure" />
              <div>
                <div className="login-feature-label">SECURE</div>
                <div className="login-feature-desc">Encrypted National Data</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon insights" />
              <div>
                <div className="login-feature-label">INSIGHTS</div>
                <div className="login-feature-desc">Predictive Modeling</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="login-right-panel">
        <div className="login-brand">
          <div className="login-logo" />
          <div>
            <div className="login-brand-title">Edulnsight</div>
            <div className="login-brand-sub">NATIONAL PORTAL</div>
          </div>
        </div>
        <div className="login-card">
          <form onSubmit={handleSubmit}>
            <div className="login-label"><b>Email or Username</b></div>
            <div className="login-input-wrap">
              <span className="login-input-icon user" />
              <input
                type="text"
                className="login-input"
                placeholder="admin@moe.gov.lk"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="login-label-row">
              <div className="login-label"><b>Password</b></div>
              <a className="login-forgot" href="#">Forgot password?</a>
            </div>
            <div className="login-input-wrap">
              <span className="login-input-icon lock" />
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="login-remember-row">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <label htmlFor="remember">Remember this device</label>
            </div>
            {error && <div className="auth-error" style={{marginBottom: 12}}>{error}</div>}
            <button className="login-btn" type="submit">Sign In to Portal</button>
          </form>
        </div>
        <div className="login-footer">
          <a href="#">Privacy Policy</a>
          <span>•</span>
          <a href="#">Terms of Service</a>
          <span>•</span>
          <a href="#">Support</a>
        </div>
        <div className="login-copyright">
          © 2024 National Education Analytics. All Rights Reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
