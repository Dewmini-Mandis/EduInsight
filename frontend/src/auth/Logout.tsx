import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { logout } from "./authUtils";

const Logout = () => {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogout = async () => {
    setStatus("working");
    setMessage("");

    const token = localStorage.getItem("token");
    try {
      if (token) {
        const res = await fetch("/api/accounts/logout/", {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        if (!res.ok && res.status !== 204) {
          throw new Error("Logout failed");
        }
      }
      logout();
      setStatus("done");
    } catch (err: any) {
      logout();
      setStatus("error");
      setMessage(err.message || "Logout failed");
    }
  };

  return (
    <div className="login-root">
      <div className="login-left-panel">
        <div className="login-left-content">
          <h1 className="login-title">Session Ending, Data Stays Protected.</h1>
          <p className="login-desc">
            Your session will close securely and all access tokens will be
            revoked. Return anytime to continue monitoring national education
            insights.
          </p>
          <div className="login-feature-row">
            <div className="login-feature">
              <div className="login-feature-icon secure" />
              <div>
                <div className="login-feature-label">SECURE</div>
                <div className="login-feature-desc">Token Revocation</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon insights" />
              <div>
                <div className="login-feature-label">READY</div>
                <div className="login-feature-desc">Resume Anytime</div>
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
        <div className="login-card logout-card">
          <div className="logout-title">Sign out of the portal?</div>
          <div className="logout-desc">
            This ends your active session and clears your access token on this
            device.
          </div>
          {status === "error" && (
            <div className="auth-error" style={{ marginBottom: 12 }}>
              {message}
            </div>
          )}
          {status === "done" ? (
            <button
              className="login-btn"
              type="button"
              onClick={() => navigate("/login")}
            >
              Return to Sign In
            </button>
          ) : (
            <div className="logout-actions">
              <button
                className="login-btn"
                type="button"
                onClick={handleLogout}
                disabled={status === "working"}
              >
                {status === "working" ? "Signing Out..." : "Sign Out"}
              </button>
              <button
                className="logout-secondary"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
            </div>
          )}
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

export default Logout;
