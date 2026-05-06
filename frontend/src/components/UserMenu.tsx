import React from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth/authUtils";

const UserMenu = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div className="user-menu">
      <button onClick={handleLogout} className="auth-btn" style={{width: "100%"}}>
        Sign Out
      </button>
    </div>
  );
};

export default UserMenu;
