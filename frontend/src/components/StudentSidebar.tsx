import React from "react";
import { Map, Trophy, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StudentSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeSection: string;
  setActiveSection: (section: "learning-path" | "progress" | "quizzes" | "recommendations") => void;
  setQuizAction: (action: "list" | "attempt" | "result" | "history_detail") => void;
  setLearningPathStep: (step: "term" | "lesson" | "level") => void;
  setSelectedAttempt: (attempt: any) => void;
  setSelectedQuiz: (quiz: any) => void;
  initials: string;
  displayName: string;
  currentUser: any;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({
  collapsed,
  setCollapsed,
  activeSection,
  setActiveSection,
  setQuizAction,
  setLearningPathStep,
  setSelectedAttempt,
  setSelectedQuiz,
  initials,
  displayName,
  currentUser
}) => {
  const navigate = useNavigate();

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
              <div className="sidebar-role">STUDENT</div>
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
          <button
            className={`teacher-nav-link ${activeSection === "learning-path" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveSection("learning-path");
              setQuizAction("list");
              setLearningPathStep("term");
              setSelectedAttempt(null);
              setSelectedQuiz(null);
            }}
          >
            <Map size={18} strokeWidth={2.5} />
            <span className="teacher-nav-text">Learning Path</span>
          </button>
          <button
            className={`teacher-nav-link ${activeSection === "progress" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveSection("progress");
              setQuizAction("list");
              setSelectedAttempt(null);
              setSelectedQuiz(null);
            }}
          >
            <Trophy size={18} strokeWidth={2.5} />
            <span className="teacher-nav-text">My Progress</span>
          </button>
          <button
            className={`teacher-nav-link ${activeSection === "recommendations" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveSection("recommendations");
              setQuizAction("list");
              setSelectedAttempt(null);
              setSelectedQuiz(null);
            }}
          >
            <Target size={18} strokeWidth={2.5} />
            <span className="teacher-nav-text">Recommendations</span>
          </button>
        </nav>
      </div>
      <div className="teacher-sidebar-footer">
        <div className="teacher-user-info-card">
          <div className="teacher-user-avatar">{initials}</div>
          <div className="teacher-user-details">
            <span className="teacher-user-name">{displayName}</span>
            <span className="teacher-user-email" style={{fontSize: "12px", color: "var(--text-muted)"}}>
              {currentUser?.email || "student@school.edu.lk"}
            </span>
          </div>
          <svg style={{marginLeft: "auto", color: "var(--text-muted)"}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <button
          className="teacher-signout-btn"
          type="button"
          onClick={() => navigate("/logout")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default StudentSidebar;
