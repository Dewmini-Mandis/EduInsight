import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { setUser } from "./authUtils";
import {
  ChevronDown,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  ShieldCheck
} from "lucide-react";

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
      {/* LEFT HERO PANEL */}
      <div className="login-left-panel">
        {/* Books Background Image */}
        <div className="login-bg-books"></div>

        <div className="login-brand-left" style={{ alignItems: 'flex-start' }}>
          <img src="/eduinsight-logo.png" alt="EduInsight" className="login-brand-logo" />
        </div>

        <div className="login-left-content">
          <h1 className="login-hero-title">
            Empowering Education <br />
            Through <span className="login-hero-title-highlight">Data Insights.</span>
          </h1>
        </div>
      </div>

      {/* RIGHT LOGIN PANEL */}
      <div className="login-right-panel">
        <div className="login-lang-selector">
          <Globe size={18} />
          <span>English</span>
          <ChevronDown size={18} />
        </div>

        <div className="login-right-content">
          <div className="login-header">
            <img src="/eduinsight-logo.png" alt="EduInsight" className="login-brand-logo mobile-only-logo" />
            <h2 className="login-header-title" style={{ color: "var(--dark-navy)" }}>Sign In</h2>
          </div>

          <div className="login-card">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <ShieldCheck size={18} />
                  {error}
                </div>
              )}

              <div className="login-input-group">
                <label className="login-label">Email or Username</label>
                <div className="login-input-wrapper">
                  <User className="login-input-icon" size={20} />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="admin@edu.lk"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">Password</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-input-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit">
                Sign In to Portal
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
