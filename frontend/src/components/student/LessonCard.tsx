import React from "react";
import { BookOpen, Target, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/student.css";

export interface LessonData {
  id: string | number;
  title: string;
  description?: string;
  status?: "Pending" | "In Progress" | "Completed";
  progress?: number;
  quizzesCount?: number;
  estimatedMinutes?: number;
}

interface LessonCardProps {
  lesson: LessonData;
  termName: string;
}

const LessonCard: React.FC<LessonCardProps> = ({ lesson, termName }) => {
  const navigate = useNavigate();

  const status = lesson.status || "Pending";
  const progress = lesson.progress || 0;
  const quizzesCount = lesson.quizzesCount !== undefined ? lesson.quizzesCount : 2;
  const estimatedTime = lesson.estimatedMinutes !== undefined ? lesson.estimatedMinutes : quizzesCount * 15;

  const getStatusBadge = () => {
    if (status === "Completed") {
      return <span className="student-badge-completed">Completed</span>;
    }
    if (status === "In Progress") {
      return <span className="student-badge-in-progress">In Progress</span>;
    }
    return <span className="student-badge-pending">Pending</span>;
  };

  const handleCardClick = () => {
    navigate(`/student/learning-path/term/${encodeURIComponent(termName)}/lessons/${lesson.id}`);
  };

  return (
    <div className="student-lesson-card">
      <div className="student-lesson-header">
        <div className="student-lesson-info">
          <div className="student-lesson-icon">
            <BookOpen size={20} />
          </div>
          <div className="student-lesson-title">{lesson.title}</div>
        </div>
        {getStatusBadge()}
      </div>

      <div>
        <div className="student-progress-track">
          <div
            className="student-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="student-progress-text">{progress}% Complete</div>
      </div>

      <div className="student-lesson-footer">
        <div className="student-lesson-meta">
          <div className="student-meta-item">
            <Target size={15} />
            <span>{quizzesCount} Quizzes</span>
          </div>
          <div className="student-meta-item">
            <Clock size={15} />
            <span>~{estimatedTime}m</span>
          </div>
        </div>

        <button
          type="button"
          className="student-arrow-btn"
          onClick={handleCardClick}
          title="View Quizzes"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default LessonCard;
