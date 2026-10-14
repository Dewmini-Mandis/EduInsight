import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "./authUtils";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      const token = localStorage.getItem("token");
      try {
        if (token) {
          await fetch("/api/accounts/logout/", {
            method: "POST",
            headers: {
              Authorization: `Token ${token}`,
            },
          });
        }
      } catch (err) {
        console.error("Logout request error:", err);
      } finally {
        logout();
        navigate("/login", { replace: true });
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <p style={{ fontSize: "1.2rem", fontWeight: "600", color: "#64748b" }}>Signing you out securely...</p>
    </div>
  );
};

export default Logout;
