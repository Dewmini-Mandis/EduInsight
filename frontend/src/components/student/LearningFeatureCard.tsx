import React from "react";
import { BookOpen, Target, Trophy } from "lucide-react";
import "../../styles/student.css";

const LearningFeatureCard: React.FC = () => {
  return (
    <div className="student-card" style={{ padding: "20px 28px", marginBottom: "20px" }}>
      <div className="student-features-grid">
        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ backgroundColor: "#EAF3FF", color: "#126BFF", width: "40px", height: "40px", borderRadius: "10px" }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div className="student-feature-title" style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Structured Curriculum</div>
            <div className="student-feature-desc" style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>Step by step learning aligned to syllabus</div>
          </div>
        </div>

        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ backgroundColor: "#F1EDFF", color: "#6C4BFF", width: "40px", height: "40px", borderRadius: "10px" }}
          >
            <Target size={20} />
          </div>
          <div>
            <div className="student-feature-title" style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Master Concepts</div>
            <div className="student-feature-desc" style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>Practice with quizzes and strengthen understanding</div>
          </div>
        </div>

        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ backgroundColor: "#FFFBEB", color: "#D97706", width: "40px", height: "40px", borderRadius: "10px" }}
          >
            <Trophy size={20} />
          </div>
          <div>
            <div className="student-feature-title" style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Track Progress</div>
            <div className="student-feature-desc" style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>Monitor your growth and achieve your goals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningFeatureCard;
