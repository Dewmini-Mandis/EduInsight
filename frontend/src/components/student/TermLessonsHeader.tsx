import React from "react";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/student.css";

interface TermLessonsHeaderProps {
  termName: string;
}

const TermLessonsHeader: React.FC<TermLessonsHeaderProps> = ({ termName }) => {
  const navigate = useNavigate();

  return (
    <div className="student-header-card">
      <div className="student-header-left">
        <div className="student-header-icon-box">
          <BookOpen size={24} color="#6C4BFF" />
        </div>
        <div>
          <h1 className="student-header-title">Academic Lessons for {termName}</h1>
          <p className="student-header-subtitle">
            Explore your lessons and continue your learning journey.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="student-btn-secondary"
        onClick={() => navigate("/student/learning-path")}
      >
        <ArrowLeft size={16} />
        Back to Terms
      </button>
    </div>
  );
};

export default TermLessonsHeader;
