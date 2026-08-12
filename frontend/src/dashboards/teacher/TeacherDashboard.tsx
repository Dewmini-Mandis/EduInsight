import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import EmptyState from "../../components/EmptyState";

type OverviewData = {
  total_students: number;
  active_learners: number;
  active_lessons: number;
  published_quizzes: number;
  quiz_completion_rate: number;
  at_risk_count: number;
  avg_score: number;
  recent_activities: any[];
  recent_recommendations: any[];
  performance_trend: { date: string; score: number }[];
  risk_distribution: { high: number; moderate: number; low: number };
};

const TeacherDashboard = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      if (!token) {
        setError("User session is inactive.");
        setLoading(false);
        return;
      }

      try {
        const [overviewRes, alertsRes] = await Promise.all([
          fetch("/api/analytics/overview/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/analytics/alerts/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!overviewRes.ok || !alertsRes.ok) {
          throw new Error("Failed to load dashboard metrics.");
        }

        const overviewData = await overviewRes.json() as OverviewData;
        const alertsData = await alertsRes.json() as any[];

        setData(overviewData);
        setAlerts(alertsData);
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Syncing teaching insights...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: "24px", color: "var(--danger)" }}>
        <h3>Metrics Unavailable</h3>
        <p>{error || "Could not retrieve classroom statistics."}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", cursor: "pointer", marginTop: "16px" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/teacher/analytics")}>
          <MetricCard 
            title="Active Learners" 
            value={data.active_learners} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            trend={{ value: "12%", isPositive: true, label: "vs last 7 days" }}
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/teacher/risk-alerts")}>
          <MetricCard 
            title="At-Risk Students" 
            value={data.at_risk_count} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            iconBgColor="rgba(245, 34, 61, 0.1)"
            iconColor="var(--danger)"
            trend={{ value: "2%", isPositive: false, label: "vs last 7 days" }}
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/teacher/lessons")}>
          <MetricCard 
            title="Difficult Topics" 
            value="3" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>}
            iconBgColor="rgba(255, 153, 0, 0.1)"
            iconColor="var(--warning)"
            trend={{ value: "High failure rate", isPositive: false, label: "" }}
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/teacher/analytics")}>
          <MetricCard 
            title="Class Average" 
            value={`${data.avg_score}%`} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
            iconBgColor="rgba(24, 182, 91, 0.1)"
            iconColor="var(--success)"
            trend={{ value: "5%", isPositive: true, label: "vs last 7 days" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Left column: Trend line */}
        <ChartCard 
          title="Class Performance Trend" 
          subtitle="Average score over time"
          headerAction={
            <select style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", outline: "none" }}>
              <option>Last 8 Weeks</option>
            </select>
          }
        >
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "16px 0 0 0", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to top, rgba(20, 99, 243, 0.1) 0%, transparent 100%)", clipPath: "polygon(0% 60%, 20% 50%, 40% 40%, 60% 30%, 80% 35%, 100% 20%, 100% 100%, 0% 100%)" }} />
            <svg viewBox="0 0 400 120" style={{ width: "100%", height: "100%", position: "absolute", zIndex: 1, overflow: "visible" }}>
              <path d="M0,70 L80,60 L160,48 L240,36 L320,42 L400,24" fill="none" stroke="var(--blue-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "auto", paddingTop: "8px", fontSize: "10px", color: "var(--text-secondary)", zIndex: 2 }}>
              <span>Wk 1</span><span>Wk 2</span><span>Wk 3</span><span>Wk 4</span><span>Wk 5</span><span>Wk 6</span><span>Wk 7</span><span>Wk 8</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "16px", backgroundColor: "var(--surface-muted)", padding: "12px", borderRadius: "8px" }}>
            <span style={{ fontSize: "20px" }}>🤖</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy-950)" }}>Consistent improvement this month.</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Class average increased by 5% compared to previous 8 weeks.</div>
            </div>
          </div>
        </ChartCard>

        {/* Right column: Risk donut chart */}
        <ChartCard title="Risk Overview" subtitle="Students by risk level" footer={
          <Link to="/teacher/risk-alerts" style={{ fontSize: "13px", color: "var(--blue-600)", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            View at-risk students &rarr;
          </Link>
        }>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, padding: "16px 0" }}>
            <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "conic-gradient(var(--success) 0% 70%, var(--warning) 70% 85%, var(--danger) 85% 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "76px", height: "76px", borderRadius: "50%", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--navy-950)", lineHeight: 1 }}>{data.total_students}</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Students</span>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "High Risk", count: data.risk_distribution.high, color: "var(--danger)" },
                { label: "Moderate Risk", count: data.risk_distribution.moderate, color: "var(--warning)" },
                { label: "Low Risk", count: data.risk_distribution.low, color: "var(--success)" }
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--navy-950)", fontWeight: "500" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy-950)" }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Manage Content & Students */}
        <ChartCard title="Manage Content & Students" subtitle="Create assessments and manage your classes.">
          <div style={{ display: "flex", gap: "16px", flex: 1, alignItems: "center" }}>
            <Link to="/teacher/quizzes/create" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px", borderRadius: "12px", backgroundColor: "rgba(20, 99, 243, 0.05)", textDecoration: "none", border: "1px solid rgba(20, 99, 243, 0.1)", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor="rgba(20, 99, 243, 0.1)"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor="rgba(20, 99, 243, 0.05)"}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "var(--blue-100)", color: "var(--blue-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "4px" }}>Create Quiz</span>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Build quizzes and assessments.</p>
            </Link>
            
            <Link to="/teacher/students/create" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "16px", borderRadius: "12px", backgroundColor: "rgba(101, 61, 245, 0.05)", textDecoration: "none", border: "1px solid rgba(101, 61, 245, 0.1)", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor="rgba(101, 61, 245, 0.1)"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor="rgba(101, 61, 245, 0.05)"}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "rgba(101, 61, 245, 0.1)", color: "var(--purple)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "4px" }}>Register Student</span>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Add new students to classes.</p>
            </Link>
          </div>
        </ChartCard>

        {/* Right: Recent Alerts list */}
        <ChartCard title="Recent Alerts" subtitle="AI-driven warnings" footer={
          <Link to="/teacher/risk-alerts" style={{ fontSize: "13px", color: "var(--blue-600)", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            View all alerts &rarr;
          </Link>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {alerts.slice(0, 3).map((alert, idx) => {
              let color = "var(--blue-500)";
              let bg = "rgba(20, 99, 243, 0.1)";
              if (alert.severity === "Critical" || alert.severity === "High") {
                color = "var(--danger)"; bg = "rgba(245, 34, 61, 0.1)";
              }
              else if (alert.severity === "Moderate") {
                color = "var(--warning)"; bg = "rgba(255, 153, 0, 0.1)";
              }

              return (
                <div key={alert.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }} onClick={() => navigate("/teacher/risk-alerts")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {color === "var(--danger)" ? "⚠️" : color === "var(--warning)" ? "🚨" : "ℹ️"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--navy-950)" }}>{alert.student_name} identified as risk</span>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.trigger_reason}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{alert.last_updated}</span>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>No recent alerts.</div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default TeacherDashboard;
