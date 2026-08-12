import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { getToken } from "../auth/authUtils";

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle
}) => {
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
  // Custom breadcrumbs based on the screenshots
  // E.g., Dashboard > Quizzes > Create Quiz
  const renderBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes("/quizzes/create")) {
      return (
        <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "8px" }}>
          Dashboard &gt; Quizzes &gt; <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>Create Quiz</span>
        </div>
      );
    }
    return null;
  };

  return (
    <header className="teacher-header" style={{
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "flex-start", 
      padding: "24px 32px",
      backgroundColor: "var(--background)",
      borderBottom: "1px solid var(--border)"
    }}>
      <div>
        {renderBreadcrumbs()}
        <h1 className="teacher-header-title" style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "var(--navy-950)",
          margin: "0 0 4px 0"
        }}>{title}</h1>
        <p className="teacher-header-subtitle" style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          margin: 0
        }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: "0", right: "0", backgroundColor: "var(--danger)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold" }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", width: "320px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "400px", overflowY: "auto" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--navy-950)" }}>Notifications</h3>
              <button style={{ background: "none", border: "none", color: "var(--blue-600)", fontSize: "12px", cursor: "pointer" }}>Mark all as read</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No notifications
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", backgroundColor: n.is_read ? "transparent" : "rgba(20, 99, 243, 0.05)", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: n.is_read ? "500" : "600", color: "var(--navy-950)" }}>{n.title}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>{n.message}</p>
                    {n.link && (
                      <Link to={n.link} style={{ display: "inline-block", marginTop: "8px", fontSize: "12px", color: "var(--blue-600)", textDecoration: "none" }}>View details &rarr;</Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>  );
};

export default PageHeader;
