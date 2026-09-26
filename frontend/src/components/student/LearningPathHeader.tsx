import React from "react";
import { BookOpen } from "lucide-react";
import "../../styles/student.css";

const LearningPathHeader: React.FC = () => {
  return (
    <div className="student-header-card">
      <div className="student-header-left">
        <div className="student-header-icon-box">
          <BookOpen size={24} color="#6C4BFF" />
        </div>
        <div>
          <h1 className="student-header-title">Academic Learning Path</h1>
          <p className="student-header-subtitle">
            Follow your structured curriculum, unlock quiz levels, and master academic terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LearningPathHeader;
