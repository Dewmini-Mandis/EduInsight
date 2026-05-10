import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo" />
          <div>
            <div className="admin-brand-title">EduInsight</div>
            <div className="admin-brand-sub">TEACHER</div>
          </div>
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item active" type="button">
            Class Analytics
          </button>
          <button className="admin-nav-item" type="button">
            Risk Alerts
          </button>
          <button className="admin-nav-item" type="button">
            Recommendations
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">TR</div>
            <div>
              <div className="admin-user-name">Teacher Portal</div>
              <div className="admin-user-email">teacher@school.edu.lk</div>
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
            <div className="admin-title">Teaching Insights</div>
            <div className="admin-subtitle">
              Track class performance, identify at-risk learners, and assign
              targeted interventions.
            </div>
          </div>
        </header>

        <section className="admin-metrics">
          <div className="metric-card">
            <div className="metric-label">Active Learners</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">Across assigned classes</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">At-Risk Students</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">AI-based predictions</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Difficult Topics</div>
            <div className="metric-value">--</div>
            <div className="metric-meta">High failure rate areas</div>
          </div>
        </section>

        <section className="admin-content-grid">
          <div className="admin-card">
            <div className="admin-card-title">Upcoming Actions</div>
            <div className="admin-card-subtitle">
              Review analytics dashboards and send extra activities to students.
            </div>
          </div>
          <div className="admin-card">
            <div className="admin-card-title">Recent Alerts</div>
            <div className="admin-card-subtitle">
              No alerts generated yet. Once data streams in, alerts will appear
              here.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TeacherDashboard;
