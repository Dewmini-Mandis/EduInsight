import React from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type CurrentUser = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser() as CurrentUser | null;
  const fullName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim();
  const displayName = fullName || "Teacher";
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "TR";

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
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
          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate("/dashboard/profile")}
          >
            Profile
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{initials}</div>
            <div>
              <div className="admin-user-name">{displayName}</div>
              <div className="admin-user-email">
                {currentUser?.email || "teacher@school.edu.lk"}
              </div>
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
