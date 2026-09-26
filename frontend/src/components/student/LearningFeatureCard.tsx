import React from "react";
import { BookOpen, Target, Trophy } from "lucide-react";
import "../../styles/student.css";

const LearningFeatureCard: React.FC = () => {
  return (
    <div className="student-card" style={{ padding: "24px 32px" }}>
      <div className="student-features-grid">
        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ background: "#EAF3FF", color: "#126BFF" }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div className="student-feature-title">Structured Curriculum</div>
            <div className="student-feature-desc">Step by step learning aligned to syllabus</div>
          </div>
        </div>

        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ background: "#F1EDFF", color: "#6C4BFF" }}
          >
            <Target size={20} />
          </div>
          <div>
            <div className="student-feature-title">Master Concepts</div>
            <div className="student-feature-desc">Practice with quizzes and strengthen understanding</div>
          </div>
        </div>

        <div className="student-feature-item">
          <div
            className="student-feature-icon-box"
            style={{ background: "#FEF3C7", color: "#D97706" }}
          >
            <Trophy size={20} />
          </div>
          <div>
            <div className="student-feature-title">Track Progress</div>
            <div className="student-feature-desc">Monitor your growth and achieve your goals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningFeatureCard;
