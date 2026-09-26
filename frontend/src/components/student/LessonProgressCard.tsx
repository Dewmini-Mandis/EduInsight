import React from "react";
import { CheckCircle } from "lucide-react";
import "../../styles/student.css";

interface LessonProgressCardProps {
  progress: number;
  completedQuizzes: number;
  totalQuizzes: number;
}

const LessonProgressCard: React.FC<LessonProgressCardProps> = ({
  progress,
  completedQuizzes,
  totalQuizzes,
}) => {
  return (
    <div className="student-card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
          Lesson Progress
        </h2>
        <span style={{ fontSize: "22px", fontWeight: "800", color: "#0B1F3A" }}>
          {progress}%
        </span>
      </div>

      {/* Progress Track */}
      <div
        style={{
          width: "100%",
          height: "10px",
          backgroundColor: "#EAF3FF",
          borderRadius: "5px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: "#126BFF",
            borderRadius: "5px",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Subtext */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", color: "#5D78A3" }}>
        <CheckCircle size={18} color="#126BFF" />
        <span>
          {completedQuizzes} / {totalQuizzes} Quizzes
        </span>
      </div>
    </div>
  );
};

export default LessonProgressCard;
