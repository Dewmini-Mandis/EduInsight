import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Map, Trophy, Target, LogOut, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

  const isLearningPathActive = location.pathname.includes("/student/learning-path") || location.pathname.includes("/student/dashboard");
  const isProgressActive = location.pathname.includes("/student/progress");
  const isRecommendationsActive = location.pathname.includes("/student/recommendations");

  return (
    <aside className="student-sidebar">
      <div className="student-sidebar-top">
        <div className="student-sidebar-brand">
          <div className="student-brand-container">
            <img
              src={collapsed ? "/eduinsight-logo-icon.png" : "/eduinsight-logo.png"}
              alt="EduInsight"
              className="student-sidebar-logo"
            />
            {!collapsed && <span className="student-role-badge">STUDENT</span>}
          </div>
          <button
            type="button"
            className="student-sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="student-sidebar-nav">
          <button
            type="button"
            className={`student-nav-link ${isLearningPathActive ? "active" : ""}`}
            onClick={() => navigate("/student/learning-path")}
          >
            <Map size={18} strokeWidth={2.5} />
            {!collapsed && <span>Learning Path</span>}
          </button>

          <button
            type="button"
            className={`student-nav-link ${isProgressActive ? "active" : ""}`}
            onClick={() => navigate("/student/learning-path")}
          >
            <Trophy size={18} strokeWidth={2.5} />
            {!collapsed && <span>My Progress</span>}
          </button>

          <button
            type="button"
            className={`student-nav-link ${isRecommendationsActive ? "active" : ""}`}
            onClick={() => navigate("/student/learning-path")}
          >
            <Target size={18} strokeWidth={2.5} />
            {!collapsed && <span>Recommendations</span>}
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
