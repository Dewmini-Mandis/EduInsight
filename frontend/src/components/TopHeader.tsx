import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getToken, getUser } from "../auth/authUtils";

const TopHeader: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = getUser();

  // Avatar initials and display name
  const initials = user && user.first_name && user.last_name 
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() 
    : "PP";
  
  const displayName = user && user.first_name 
    ? `${user.first_name} ${user.last_name || ""}`.trim() 
    : "Pabudi Perera";

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const res = await fetch("/api/notifications/", {
          headers: { Authorization: `Token ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };

    fetchNotifications();
  }, []);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header style={{
      display: "flex", 
      justifyContent: "flex-end", 
      alignItems: "center", 
      height: "58px",
      padding: "0 32px",
      backgroundColor: "#FFFFFF",
      borderBottom: "1px solid #E5EDF7"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5D78A3" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "#FF4D5A", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", width: "320px", backgroundColor: "#FFFFFF", border: "1px solid #E5EDF7", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "400px", overflowY: "auto" }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #E5EDF7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>Notifications</h3>
                <button style={{ background: "none", border: "none", color: "#126BFF", fontSize: "12px", cursor: "pointer" }}>Mark all as read</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
                  No notifications
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #E5EDF7", backgroundColor: n.is_read ? "transparent" : "#F4F8FD", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: n.is_read ? "500" : "600", color: "#0B1F3A" }}>{n.title}</span>
                        <span style={{ fontSize: "10px", color: "#5D78A3" }}>{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "12px", color: "#5D78A3" }}>{n.message}</p>
                      {n.link && (
                        <Link to={n.link} style={{ display: "inline-block", marginTop: "8px", fontSize: "12px", color: "#126BFF", textDecoration: "none" }}>View details &rarr;</Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "24px", width: "1px", backgroundColor: "#DCE6F3" }}></div>

        {/* User Profile Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#126BFF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600" }}>
            {initials}
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500", color: "#0B1F3A" }}>
            {displayName}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5D78A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
