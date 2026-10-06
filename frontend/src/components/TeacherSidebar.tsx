import React, { useState } from "react";
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

  const [analyticsOpen, setAnalyticsOpen] = useState(
    location.pathname.startsWith("/teacher/analytics")
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith("/teacher/reports")
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const analyticsLinks = [
    { label: "Class Performance", path: "/teacher/analytics/class-performance" },
    { label: "Student Insights", path: "/teacher/analytics/student-insights" },
    { label: "Skill & Lesson Analytics", path: "/teacher/analytics/skills-lessons" },
    { label: "Risk & Improvement", path: "/teacher/analytics/risk-improvement" },
  ];

  const reportsLinks = [
    { label: "Student Report", path: "/teacher/reports/student" },
    { label: "Class Report", path: "/teacher/reports/class" },
  ];

  const fullName = `${user?.first_name || "Sarah"} ${user?.last_name || "Smith"}`;
  const userInitials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const isAnalyticsActive = location.pathname === "/teacher/analytics";
  const isReportsActive = location.pathname === "/teacher/reports";

  return (
    <aside className={`teacher-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="teacher-sidebar-brand">
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
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-collapse-btn"
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
        {/* 1. Dashboard */}
        <button
          className={`teacher-nav-link ${location.pathname === "/teacher/dashboard" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/teacher/dashboard")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="teacher-nav-text">Dashboard</span>
        </button>

        {/* 2. Students */}
        <button
          className={`teacher-nav-link ${location.pathname.startsWith("/teacher/students") ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/teacher/students")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="teacher-nav-text">Students</span>
        </button>

        {/* 3. Quizzes */}
        <button
          className={`teacher-nav-link ${location.pathname.startsWith("/teacher/quizzes") ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/teacher/quizzes")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <span className="teacher-nav-text">Quizzes</span>
        </button>

        {/* 4. Materials */}
        <button
          className={`teacher-nav-link ${location.pathname.startsWith("/teacher/materials") ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/teacher/materials")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
          <span className="teacher-nav-text">Materials</span>
        </button>

        {/* 5. Lessons */}
        <button
          className={`teacher-nav-link ${location.pathname.startsWith("/teacher/lessons") ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/teacher/lessons")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
          <span className="teacher-nav-text">Lessons</span>
        </button>

        {/* 6. Analytics Group (Expandable) */}
        <div>
          <button
            className={`teacher-nav-link ${isAnalyticsActive ? "active" : ""}`}
            type="button"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
              }
              setAnalyticsOpen(!analyticsOpen);
            }}
            style={{ justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              {!collapsed && <span className="teacher-nav-text">Analytics</span>}
            </div>
            {!collapsed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {analyticsOpen && !collapsed && (
            <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", marginBottom: "4px" }}>
              {analyticsLinks.map((sub) => {
                const isActive = location.pathname === sub.path;
                return (
                  <button
                    key={sub.path}
                    type="button"
                    onClick={() => navigate(sub.path)}
                    style={{
                      textAlign: "left",
                      padding: "9px 14px",
                      fontSize: "16px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
                      backgroundColor: isActive ? "var(--teacher-primary)" : "transparent",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 7. Reports Group (Expandable) */}
        <div>
          <button
            className={`teacher-nav-link ${isReportsActive ? "active" : ""}`}
            type="button"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
              }
              setReportsOpen(!reportsOpen);
            }}
            style={{ justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {!collapsed && <span className="teacher-nav-text">Reports</span>}
            </div>
            {!collapsed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: reportsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {reportsOpen && !collapsed && (
            <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", marginBottom: "4px" }}>
              {reportsLinks.map((sub) => {
                const isActive = location.pathname === sub.path;
                return (
                  <button
                    key={sub.path}
                    type="button"
                    onClick={() => navigate(sub.path)}
                    style={{
                      textAlign: "left",
                      padding: "9px 14px",
                      fontSize: "16px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
                      backgroundColor: isActive ? "var(--teacher-primary)" : "transparent",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

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
