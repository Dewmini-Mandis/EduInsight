
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { setUser } from "./authUtils";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setUser(data.user);
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
          <div>
            <div className="login-brand-title">Edulnsight</div>
            <div className="login-brand-sub">NATIONAL PORTAL</div>
          </div>
        </div>
        <div className="login-card">
          <form onSubmit={handleSubmit}>
            <div className="login-label"><b>Email or Username</b></div>
            <input
              type="text"
              className="login-input"
              placeholder="admin@moe.gov.lk"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <div className="login-label"><b>Password</b></div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: "40px", width: "100%", marginBottom: "0.5rem" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "22px",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  zIndex: 10
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.2rem", marginBottom: "1.2rem" }}>
              <a className="login-forgot" href="#">Forgot password?</a>
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
