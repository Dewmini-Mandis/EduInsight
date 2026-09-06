import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth/authUtils";

interface TeacherSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    {
      label: "Dashboard",
      path: "/teacher/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      )
    },
    {
      label: "Class Analytics",
      path: "/teacher/analytics",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      )
    },
    {
      label: "Risk Alerts",
      path: "/teacher/risk-alerts",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      )
    },
    {
      label: "Lessons",
      path: "/teacher/lessons",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
      )
    },
    {
      label: "Materials",
      path: "/teacher/materials",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
      )
    },
    {
      label: "Quizzes",
      path: "/teacher/quizzes",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      )
    },
    {
      label: "Students",
      path: "/teacher/students",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      )
    }
  ];

  const fullName = `${user?.first_name || "Sarah"} ${user?.last_name || "Smith"}`;
  const userInitials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <aside className={`teacher-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div>
        <div className="teacher-sidebar-brand" style={{ justifyContent: "space-between" }}>
          <div className="sidebar-brand-container">
            <img 
              src={collapsed ? "/eduinsight-logo-icon.png" : "/eduinsight-logo.png"} 
              alt="EduInsight" 
              className="sidebar-logo"
            />
            {!collapsed && (
              <div className="sidebar-role">TEACHER</div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", padding: "4px" }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <polyline points="13 17 18 12 13 7" />
              ) : (
                <polyline points="11 17 6 12 11 7" />
              )}
              <line x1="18" y1="12" x2="6" y2="12" />
            </svg>
          </button>
        </div>
        
        <nav className="teacher-sidebar-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/teacher/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                className={`teacher-nav-link ${isActive ? "active" : ""}`}
                type="button"
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span className="teacher-nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="teacher-sidebar-footer">
        <div className="teacher-user-info-card">
          <div className="teacher-user-avatar">{userInitials}</div>
          <div className="teacher-user-details">
            <span className="teacher-user-name">{fullName}</span>
            <span className="teacher-user-email" style={{fontSize: "12px", color: "var(--text-muted)"}}>{user?.role === "TEACHER" ? "Teacher" : (user?.email || "teacher@school.edu.lk")}</span>
          </div>
          <svg style={{marginLeft: "auto", color: "var(--text-muted)"}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <button className="teacher-signout-btn" type="button" onClick={() => navigate("/teacher/profile")} style={{ marginBottom: "8px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </button>
        <button className="teacher-signout-btn" type="button" onClick={handleLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
