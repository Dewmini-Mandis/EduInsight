import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import "../../../styles/student.css";

export interface ActivityItem {
  id: number;
  quizId: number;
  title: string;
  lessonName: string;
  completionDate: string;
  score: number;
  isPassed: boolean;
  attemptNumber: number;
  attemptType?: "ORDINARY" | "REASSESSMENT";
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const navigate = useNavigate();

  return (
    <div className="student-card" style={{ padding: "24px 28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Recent Learning Activity
          </h3>
          <p style={{ fontSize: "13px", color: "#5D78A3", margin: "2px 0 0 0" }}>
            Your latest quiz submissions and learning milestones.
          </p>
        </div>

        <button
          type="button"
          className="student-btn-secondary"
          style={{ padding: "8px 14px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={() => navigate("/student/progress/history")}
        >
          <span>View All History</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {!activities || activities.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
          No recent learning activity found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activities.slice(0, 5).map((act) => (
            <div
              key={act.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "1px solid #DCE6F3",
                background: "#FFFFFF",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "220px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: act.isPassed ? "#E9FBF4" : "#FFF1F3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {act.isPassed ? (
                    <CheckCircle2 size={20} color="#16B978" />
                  ) : (
                    <XCircle size={20} color="#FF4054" />
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0B1F3A" }}>
                    {act.title}
                    {act.attemptType === "REASSESSMENT" && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "#F1EDFF",
                          color: "#6C4BFF",
                          fontWeight: 600,
                        }}
                      >
                        Reassessment
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>
                    Lesson: {act.lessonName || "General"} &bull; Attempt #{act.attemptNumber}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: act.isPassed ? "#16B978" : "#FF4054",
                    }}
                  >
                    {act.score}%
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#5D78A3",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Clock size={12} />
                    <span>{act.completionDate}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="student-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                  onClick={() => navigate(`/student/progress/quiz/${act.quizId}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
