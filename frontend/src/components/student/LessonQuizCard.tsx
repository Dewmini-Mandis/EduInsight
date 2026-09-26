import React from "react";
import { BookOpen, Lock, CheckCircle, FileText, Clock, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import "../../styles/student.css";

export interface QuizItem {
  id: string | number;
  title: string;
  order?: number;
  questionCount: number;
  durationMinutes: number;
  passMark: number;
  maxAttempts: number;
  attemptsUsed: number;
  status: "PASSED" | "AVAILABLE" | "IN_PROGRESS" | "FAILED" | "EXHAUSTED" | "LOCKED";
  latestAttemptId?: string | number | null;
  latestScore?: number | null;
  lockedReason?: string;
  previousQuizTitle?: string;
}

interface LessonQuizCardProps {
  quiz: QuizItem;
  index: number;
  onStartQuiz: (quiz: QuizItem) => void;
  onViewResults: (quiz: QuizItem) => void;
}

const LessonQuizCard: React.FC<LessonQuizCardProps> = ({
  quiz,
  index,
  onStartQuiz,
  onViewResults,
}) => {
  const quizNumber = quiz.order || index + 1;

  // 1. LOCKED TEASER CARD STATE (Matching Card 2 in Reference Image)
  if (quiz.status === "LOCKED") {
    return (
      <div
        className="student-quiz-card locked"
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: 0.9,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#EDF2F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748B",
              flexShrink: 0,
            }}
          >
            <Lock size={22} color="#64748B" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#64748B" }}>
              {quiz.title}
            </h3>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#64748B", marginTop: "4px" }}>
              Quiz {quizNumber} • {quiz.questionCount || 10} Questions
            </div>
            <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "2px" }}>
              {quiz.lockedReason || `Complete ${quiz.previousQuizTitle || `Quiz ${quizNumber - 1}`} and pass to unlock this quiz.`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              background: "#E2E8F0",
              color: "#64748B",
              fontSize: "12px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
            }}
          >
            Locked
          </span>
          <Lock size={18} color="#94A3B8" />
        </div>
      </div>
    );
  }

  // 2. PASSED STATE
  if (quiz.status === "PASSED") {
    return (
      <div
        className="student-quiz-card passed"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DCE6F3",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(11, 31, 58, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#E9FBF4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16B978",
              flexShrink: 0,
            }}
          >
            <CheckCircle size={24} color="#16B978" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5D78A3", marginTop: "6px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FileText size={15} color="#5D78A3" />
                {quiz.questionCount || 10} Questions
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Clock size={15} color="#5D78A3" />
                {quiz.durationMinutes || 10} Minutes
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              background: "#E9FBF4",
              color: "#16B978",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CheckCircle size={14} color="#16B978" />
            Passed
          </span>
          <button
            type="button"
            className="student-btn-secondary"
            style={{ height: "44px", padding: "0 20px" }}
            onClick={() => onViewResults(quiz)}
          >
            View Results
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 3. IN_PROGRESS / DRAFT STATE
  if (quiz.status === "IN_PROGRESS") {
    return (
      <div
        className="student-quiz-card active"
        style={{
          background: "#FFFFFF",
          border: "1.5px solid #126BFF",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 16px rgba(18, 107, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#EAF3FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#126BFF",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} color="#126BFF" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5D78A3", marginTop: "6px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FileText size={15} color="#5D78A3" />
                {quiz.questionCount || 10} Questions
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Clock size={15} color="#5D78A3" />
                {quiz.durationMinutes || 10} Minutes
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              background: "#EAF3FF",
              color: "#126BFF",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
            }}
          >
            In Progress
          </span>
          <button
            type="button"
            className="student-btn-primary"
            style={{ height: "44px", padding: "0 22px" }}
            onClick={() => onStartQuiz(quiz)}
          >
            Resume Quiz
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 4. FAILED / RETAKE STATE
  if (quiz.status === "FAILED") {
    return (
      <div
        className="student-quiz-card failed"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DCE6F3",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(11, 31, 58, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#FEF3C7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D97706",
              flexShrink: 0,
            }}
          >
            <RefreshCw size={22} color="#D97706" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5D78A3", marginTop: "6px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FileText size={15} color="#5D78A3" />
                {quiz.questionCount || 10} Questions
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Clock size={15} color="#5D78A3" />
                {quiz.durationMinutes || 10} Minutes
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              background: "#FEF3C7",
              color: "#B45309",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
            }}
          >
            Retake Available
          </span>
          <button
            type="button"
            className="student-btn-primary"
            style={{ height: "44px", padding: "0 22px" }}
            onClick={() => onStartQuiz(quiz)}
          >
            Try Again
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 5. EXHAUSTED ATTEMPTS STATE
  if (quiz.status === "EXHAUSTED") {
    return (
      <div
        className="student-quiz-card exhausted"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DCE6F3",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FF4054",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} color="#FF4054" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
              {quiz.questionCount || 10} Questions • Attempts Exhausted
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              background: "#FEF2F2",
              color: "#FF4054",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
            }}
          >
            Attempts Exhausted
          </span>
          <button
            type="button"
            className="student-btn-secondary"
            style={{ height: "44px", padding: "0 20px" }}
            onClick={() => onViewResults(quiz)}
          >
            View Results
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 6. DEFAULT AVAILABLE STATE (Matching Card 1 in Reference Image)
  return (
    <div
      className="student-quiz-card available"
      style={{
        background: "#FFFFFF",
        border: "1px solid #DCE6F3",
        borderRadius: "16px",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(11, 31, 58, 0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: "#F1EDFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6C4BFF",
            flexShrink: 0,
          }}
        >
          <BookOpen size={24} color="#6C4BFF" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
            {quiz.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5D78A3", marginTop: "6px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FileText size={15} color="#5D78A3" />
              {quiz.questionCount || 10} Questions
            </span>
            <span style={{ color: "#DCE6F3" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={15} color="#5D78A3" />
              {quiz.durationMinutes || 10} Minutes
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span
          style={{
            background: "#EAF3FF",
            color: "#126BFF",
            fontSize: "13px",
            fontWeight: "600",
            padding: "6px 14px",
            borderRadius: "20px",
          }}
        >
          Available
        </span>
        <button
          type="button"
          className="student-btn-primary"
          style={{ height: "44px", padding: "0 22px" }}
          onClick={() => onStartQuiz(quiz)}
        >
          Start Quiz
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default LessonQuizCard;
