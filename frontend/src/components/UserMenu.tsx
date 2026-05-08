import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth/authUtils";

type UserProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

const UserMenu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/accounts/me/", {
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as UserProfile;
          setUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileClick = () => {
    navigate("/dashboard/profile");
  };

  return (
    <div className="user-menu">
      {!loading && user && (
        <div style={{ marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}>
          <button
            onClick={handleProfileClick}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem",
              backgroundColor: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            <div style={{ fontWeight: "500", color: "#1f2937" }}>{user.first_name} {user.last_name}</div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{user.email}</div>
          </button>
        </div>
      )}
      <button onClick={handleLogout} className="auth-btn" style={{ width: "100%" }}>
        Sign Out
      </button>
    </div>
  );
};

export default UserMenu;
