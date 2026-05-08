import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";

const StudentDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo" />
          <div>
            <div className="admin-brand-title">EduInsight</div>
            <div className="admin-brand-sub">STUDENT</div>
          </div>
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item active" type="button">
            My Progress
          </button>
          <button className="admin-nav-item" type="button">
            Assigned Quizzes
          </button>
          <button className="admin-nav-item" type="button">
            Recommendations
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">ST</div>
            <div>
              <div className="admin-user-name">Student Portal</div>
              <div className="admin-user-email">student@school.edu.lk</div>
            </div>
          </div>
          <button
            className="admin-ghost-btn"
            type="button"
            onClick={() => navigate("/logout")}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div className="admin-title">Learning Progress</div>
            <div className="admin-subtitle">
              View quiz results, track progress, and follow recommended lessons.
            </div>
          </div>
        </header>

        <section className="admin-metrics">
          <div className="metric-card">
            <div className="metric-label">Completed Quizzes</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">This term</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Score</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">Across all quizzes</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Recommended Lessons</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">Personalized by AI</div>
          </div>
        </section>

        <section className="admin-content-grid">
          <div className="admin-card">
            <div className="admin-card-title">Next Quiz</div>
            <div className="admin-card-subtitle">
              Your assigned quizzes will appear here once configured by your
              teacher.
            </div>
          </div>
          <div className="admin-card">
            <div className="admin-card-title">Recommended Activities</div>
            <div className="admin-card-subtitle">
              Personalized practice will show up as soon as analytics are
              available.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
