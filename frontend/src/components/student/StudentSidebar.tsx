import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Map, Trophy, Target, LogOut, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, ShieldAlert } from "lucide-react";
import { getUser } from "../../auth/authUtils";
import "../../styles/student.css";

interface StudentSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = getUser() as any;
  const fullName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim();
  const displayName = fullName || "Kaveesha Silva";
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "KS";
  const email = currentUser?.email || "kaveesha@gmail.com";

  const isMyLearningActive =
    location.pathname.includes("/student/my-learning") ||
    location.pathname.includes("/student/learning-path") ||
    location.pathname === "/student" ||
    location.pathname === "/student/";
  const isPerformanceActive = location.pathname.includes("/student/performance");
  const isSkillsActive = location.pathname.includes("/student/skills");
  const isProgressActive = location.pathname.includes("/student/progress");

  return (
    <aside className="student-sidebar">
      <div className="student-sidebar-top">
        <div className="teacher-sidebar-brand" style={{ padding: "8px 8px 0 8px", marginBottom: "24px" }}>
          <div className="sidebar-brand-container">
            <img
              src={collapsed ? "/eduinsight-logo-icon.png" : "/eduinsight-logo.png"}
              alt="EduInsight"
              className="sidebar-logo"
            />
            {!collapsed && (
              <div className="sidebar-role">STUDENT</div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
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

        <nav className="student-sidebar-nav">
          <button
            type="button"
            className={`student-nav-link ${isMyLearningActive ? "active" : ""}`}
            onClick={() => navigate("/student/my-learning")}
          >
            <Map size={18} strokeWidth={2.5} />
            {!collapsed && <span>My Learning</span>}
          </button>

          <button
            type="button"
            className={`student-nav-link ${isPerformanceActive ? "active" : ""}`}
            onClick={() => navigate("/student/performance")}
          >
            <TrendingUp size={18} strokeWidth={2.5} />
            {!collapsed && <span>My Performance</span>}
          </button>

          <button
            type="button"
            className={`student-nav-link ${isSkillsActive ? "active" : ""}`}
            onClick={() => navigate("/student/skills")}
          >
            <Target size={18} strokeWidth={2.5} />
            {!collapsed && <span>My Skills</span>}
          </button>



          <button
            type="button"
            className={`student-nav-link ${isProgressActive ? "active" : ""}`}
            onClick={() => navigate("/student/progress")}
          >
            <Trophy size={18} strokeWidth={2.5} />
            {!collapsed && <span>My Progress</span>}
          </button>
        </nav>
      </div>

      <div className="student-sidebar-footer">
        <div className="student-user-profile-card">
          <div className="student-user-avatar">{initials}</div>
          {!collapsed && (
            <>
              <div className="student-user-details">
                <span className="student-user-name">{displayName}</span>
                <span className="student-user-email">{email}</span>
              </div>
              <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
            </>
          )}
        </div>

        <button
          type="button"
          className="student-signout-btn"
          onClick={() => navigate("/logout")}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default StudentSidebar;
