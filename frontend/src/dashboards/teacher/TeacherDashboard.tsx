import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { queryClient } from "../../api/queryClient";

interface SummaryData {
  totalStudents: number;
  activeQuizzes: number;
  learningMaterials: number;
  lessonsManaged: number;
}

interface ClassPerformance {
  className: string;
  avgScore: number;
}

interface RiskStudent {
  id: string;
  name: string;
  className: string;
  riskLevel: "High Risk" | "Medium Risk" | "Low Risk";
}

interface QuizItem {
  id: string;
  title: string;
  lesson: string;
  assignedClass: string;
  attempts: number;
  status: "Active" | "Draft" | "Closed";
}

interface MaterialItem {
  id: string;
  title: string;
  type: "Video" | "Note" | "Attachment";
  uploadDate: string;
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getUser();
  const teacherName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Sarah Jenkins" : "Sarah Jenkins";
  const teacherInitials = teacherName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "SJ";

  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<SummaryData>({
    totalStudents: 0,
    activeQuizzes: 0,
    learningMaterials: 0,
    lessonsManaged: 0,
  });

  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizItem[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<MaterialItem[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Token ${token}` };
      try {
        const data = await queryClient.fetchQuery(
          ["teacher", "dashboard-summary"],
          async () => {
            const res = await fetch("/api/analytics/overview/dashboard_summary/", { headers });
            return res.ok ? await res.json() : null;
          },
          { staleTime: 120000 }
        );

        if (data) {
          if (data.summary) {
            setSummary({
              totalStudents: data.summary.totalStudents ?? 0,
              activeQuizzes: data.summary.activeQuizzes ?? 0,
              learningMaterials: data.summary.learningMaterials ?? 0,
              lessonsManaged: data.summary.lessonsManaged ?? 0,
            });
          }
          if (data.classPerformance) {
            setClassPerformance(data.classPerformance);
          }
          if (data.riskStudents) {
            setRiskStudents(data.riskStudents);
          }
          if (data.recentQuizzes) {
            setRecentQuizzes(data.recentQuizzes);
          }
          if (data.recentMaterials) {
            setRecentMaterials(data.recentMaterials);
          }
        }
      } catch (e) {
        console.error("Error fetching dashboard metrics:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "16px 0 32px 0" }}>
      
      {/* 1. Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#0B1F3A", letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: "400", color: "#5D78A3" }}>
            Welcome back. Here’s an overview of your classes and teaching activity.
          </p>
        </div>

        {/* Top-Right Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Notification Button */}
          <button
            title="Notifications"
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              border: "1px solid #DCE6F3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(6, 38, 83, 0.03)",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5D78A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#FF4054",
                border: "2px solid #FFFFFF",
              }}
            />
          </button>

          {/* User Profile Dropdown Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #DCE6F3",
              padding: "4px 14px 4px 6px",
              borderRadius: "30px",
              boxShadow: "0 2px 6px rgba(6, 38, 83, 0.03)",
              cursor: "pointer",
            }}
            onClick={() => navigate("/teacher/profile")}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "#126BFF",
                color: "#FFFFFF",
                fontWeight: "700",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {teacherInitials}
            </div>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>
              {teacherName}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5D78A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Cards (4 in a row) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Card 1 */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(18, 107, 255, 0.08)",
              color: "#126BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: "1.1" }}>
              {summary.totalStudents}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#5D78A3", marginTop: "4px" }}>
              Total Students
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(22, 155, 255, 0.08)",
              color: "#169BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: "1.1" }}>
              {summary.activeQuizzes}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#5D78A3", marginTop: "4px" }}>
              Active Quizzes
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(101, 61, 245, 0.08)",
              color: "#653DF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: "1.1" }}>
              {summary.learningMaterials}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#5D78A3", marginTop: "4px" }}>
              Learning Materials
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(22, 185, 120, 0.08)",
              color: "#16B978",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: "1.1" }}>
              {summary.lessonsManaged}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#5D78A3", marginTop: "4px" }}>
              Lessons Managed
            </div>
          </div>
        </div>
      </div>

      {/* 3. First Content Row: Class Performance (2fr) + Risk Alerts (1fr) */}
      <div className="teacher-dashboard-two-col">
        {/* Left Section — Class Performance Overview */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                  Class Performance Overview
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
                  Track how your classes are performing this term.
                </p>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#126BFF",
                  backgroundColor: "rgba(18, 107, 255, 0.08)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                }}
              >
                Average Score (%)
              </span>
            </div>

            {/* Clean SVG Bar Chart */}
            <div style={{ position: "relative", width: "100%", height: "220px", marginTop: "10px" }}>
              {/* Grid Lines */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "35px",
                  right: 0,
                  bottom: "30px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pointerEvents: "none",
                }}
              >
                {[100, 75, 50, 25, 0].map((val) => (
                  <div key={val} style={{ borderBottom: "1px dashed #EBF1FA", width: "100%", position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "-35px",
                        top: "-8px",
                        fontSize: "11px",
                        color: "#94A3B8",
                      }}
                    >
                      {val}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Bars Container */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "40px",
                  right: 0,
                  bottom: "30px",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  padding: "0 20px",
                }}
              >
                {classPerformance.map((item) => (
                  <div
                    key={item.className}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                      width: "48px",
                    }}
                  >
                    {/* Score Label above Bar */}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#0B1F3A",
                        marginBottom: "6px",
                      }}
                    >
                      {item.avgScore}%
                    </span>

                    {/* Bar */}
                    <div
                      style={{
                        width: "36px",
                        height: `${item.avgScore}%`,
                        backgroundColor: "#126BFF",
                        borderRadius: "6px 6px 0 0",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 6px rgba(18, 107, 255, 0.15)",
                      }}
                    />

                    {/* Class Label below Bar */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-24px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#5D78A3",
                      }}
                    >
                      {item.className}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "28px",
              paddingTop: "14px",
              borderTop: "1px solid #F0F4F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#5D78A3",
            }}
          >
            <span>Top performing class: <strong style={{ color: "#0B1F3A" }}>11A (89%)</strong></span>
            <button
              onClick={() => navigate("/teacher/analytics/class-performance")}
              style={{
                background: "none",
                border: "none",
                color: "#126BFF",
                fontWeight: "600",
                cursor: "pointer",
                padding: 0,
                fontSize: "12px",
              }}
            >
              Detailed Analytics &rarr;
            </button>
          </div>
        </div>

        {/* Right Section — Risk Alerts */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                  Risk Alerts
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
                  Students who may need support.
                </p>
              </div>
              <button
                onClick={() => navigate("/teacher/analytics/risk-improvement")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#126BFF",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                View All
              </button>
            </div>

            {/* At-Risk Students List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {riskStudents.map((student) => {
                let badgeBg = "rgba(22, 185, 120, 0.1)";
                let badgeColor = "#16B978";

                if (student.riskLevel === "High Risk") {
                  badgeBg = "rgba(255, 64, 84, 0.1)";
                  badgeColor = "#FF4054";
                } else if (student.riskLevel === "Medium Risk") {
                  badgeBg = "rgba(245, 166, 35, 0.1)";
                  badgeColor = "#F5A623";
                }

                return (
                  <div
                    key={student.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #EDF2F7",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>
                        {student.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                        Class {student.className}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          padding: "4px 10px",
                          borderRadius: "12px",
                        }}
                      >
                        {student.riskLevel}
                      </span>
                      <button
                        onClick={() => navigate("/teacher/analytics/risk-improvement")}
                        title="View details"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#5D78A3",
                          cursor: "pointer",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #F0F4F9",
              fontSize: "12px",
              color: "#5D78A3",
              textAlign: "center",
            }}
          >
            2 high risk students require early intervention.
          </div>
        </div>
      </div>

      {/* 4. Second Content Row: Recent Quizzes (2fr) + Recent Materials (1fr) */}
      <div className="teacher-dashboard-two-col">
        {/* Left Section — Recent Quizzes */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                Recent Quizzes
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
                Your latest created or updated quizzes.
              </p>
            </div>
            <button
              onClick={() => navigate("/teacher/quizzes")}
              style={{
                background: "none",
                border: "none",
                color: "#126BFF",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              View All Quizzes
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #EBF1FA" }}>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3" }}>Quiz Title</th>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3" }}>Lesson</th>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3" }}>Class</th>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3" }}>Attempts</th>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3" }}>Status</th>
                  <th style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "600", color: "#5D78A3", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentQuizzes.map((quiz) => {
                  let statusBg = "rgba(22, 185, 120, 0.1)";
                  let statusColor = "#16B978";

                  if (quiz.status === "Draft") {
                    statusBg = "rgba(18, 107, 255, 0.1)";
                    statusColor = "#126BFF";
                  } else if (quiz.status === "Closed") {
                    statusBg = "rgba(93, 120, 163, 0.1)";
                    statusColor = "#5D78A3";
                  }

                  return (
                    <tr key={quiz.id} style={{ borderBottom: "1px solid #F5F8FC" }}>
                      <td style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>
                        {quiz.title}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "#5D78A3" }}>
                        {quiz.lesson}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "#0B1F3A", fontWeight: "500" }}>
                        {quiz.assignedClass}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "#5D78A3" }}>
                        {quiz.attempts}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: statusBg,
                            color: statusColor,
                            padding: "4px 10px",
                            borderRadius: "12px",
                          }}
                        >
                          {quiz.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <button
                          onClick={() => navigate(quiz.status === "Draft" ? `/teacher/quizzes/${quiz.id}/edit` : `/teacher/quizzes`)}
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #DCE6F3",
                            borderRadius: "6px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#126BFF",
                            cursor: "pointer",
                          }}
                        >
                          {quiz.status === "Draft" ? "Edit" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section — Recent Materials */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                  Recent Materials
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
                  Latest uploaded notes and videos.
                </p>
              </div>
              <button
                onClick={() => navigate("/teacher/materials")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#126BFF",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                View All
              </button>
            </div>

            {/* Materials List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentMaterials.map((item) => {
                let typeBg = "rgba(18, 107, 255, 0.1)";
                let typeColor = "#126BFF";

                if (item.type === "Video") {
                  typeBg = "rgba(101, 61, 245, 0.1)";
                  typeColor = "#653DF5";
                } else if (item.type === "Attachment") {
                  typeBg = "rgba(93, 120, 163, 0.1)";
                  typeColor = "#5D78A3";
                }

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #EDF2F7",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0B1F3A" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#5D78A3", marginTop: "2px" }}>
                        Uploaded {item.uploadDate}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor: typeBg,
                        color: typeColor,
                        padding: "3px 8px",
                        borderRadius: "8px",
                      }}
                    >
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              onClick={() => navigate("/teacher/materials/note/create")}
              style={{
                width: "100%",
                backgroundColor: "#F5F8FC",
                border: "1px dashed #DCE6F3",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#126BFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              + Upload New Material
            </button>
          </div>
        </div>
      </div>

      {/* 5. Quick Actions Section */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #DCE6F3",
          borderRadius: "14px",
          padding: "20px 24px",
          boxShadow: "0 2px 8px rgba(6, 38, 83, 0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0B1F3A" }}>
            Quick Actions
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
            Frequently used tasks and workflow shortcuts.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/teacher/quizzes/create")}
            style={{
              backgroundColor: "#126BFF",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 6px rgba(18, 107, 255, 0.2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Quiz
          </button>

          <button
            onClick={() => navigate("/teacher/materials/note/create")}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#126BFF",
              border: "1px solid #126BFF",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Material
          </button>

          <button
            onClick={() => navigate("/teacher/lessons")}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#126BFF",
              border: "1px solid #126BFF",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Add Lesson
          </button>

          <button
            onClick={() => navigate("/teacher/reports/class")}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#5D78A3",
              border: "1px solid #DCE6F3",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            View Reports
          </button>
        </div>
      </div>

      {/* 6. Subtle Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#5D78A3",
          padding: "8px 4px 0 4px",
          borderTop: "1px solid #EBF1FA",
        }}
      >
        <span>Teaching smarter with EduInsight</span>
        <span>Last updated today at 10:45 AM</span>
      </div>
    </div>
  );
};

export default TeacherDashboard;
