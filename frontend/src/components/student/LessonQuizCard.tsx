import React from "react";
import { BookOpen, Lock, CheckCircle, FileText, Clock, ChevronRight, AlertTriangle, RefreshCw, CheckSquare, ExternalLink, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/student.css";

export interface RemediationMaterialItem {
  id: number;
  title: string;
  material_type: string;
  is_completed: boolean;
}

export interface QuizItem {
  id: string | number;
  title: string;
  order?: number;
  questionCount: number;
  durationMinutes: number;
  passMark: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining?: number;
  status: "PASSED" | "AVAILABLE" | "IN_PROGRESS" | "FAILED" | "EXHAUSTED" | "LOCKED" | "FAILED_RETRYABLE" | "FAILED_EXHAUSTED";
  latestAttemptId?: string | number | null;
  latestScore?: number | null;
  lockedReason?: string;
  previousQuizTitle?: string;
  
  // Remediation & Reassessment Workflow props
  remediationState?: "PENDING_MATERIALS" | "REASSESSMENT_UNLOCKED" | "REASSESSMENT_IN_PROGRESS" | "COMPLETED_SUCCESS" | "ESCALATED_TEACHER" | null;
  requiredMaterials?: RemediationMaterialItem[];
  allMaterialsCompleted?: boolean;
  reassessmentStatus?: "NOT_ELIGIBLE" | "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "PASSED" | "FAILED";
  highRiskWarning?: boolean;
  highRiskDetails?: { risk_level: string; risk_probability: number } | null;
}

interface LessonQuizCardProps {
  quiz: QuizItem;
  index: number;
  onStartQuiz: (quiz: QuizItem, isReassessment?: boolean) => void;
  onViewResults: (quiz: QuizItem) => void;
}

const LessonQuizCard: React.FC<LessonQuizCardProps> = ({
  quiz,
  index,
  onStartQuiz,
  onViewResults,
}) => {
  const navigate = useNavigate();
  const quizNumber = quiz.order || index + 1;
  const maxAttempts = quiz.maxAttempts || 3;
  const attemptsUsed = quiz.attemptsUsed || 0;
  const currentAttemptNumber = Math.min(attemptsUsed + 1, maxAttempts);

  const isExhausted = quiz.status === "EXHAUSTED" || quiz.status === "FAILED_EXHAUSTED" || (attemptsUsed >= maxAttempts && quiz.status !== "PASSED");
  const isRetryable = quiz.status === "FAILED" || quiz.status === "FAILED_RETRYABLE" || (attemptsUsed > 0 && attemptsUsed < maxAttempts && quiz.status !== "PASSED");

  // 1. LOCKED TEASER CARD STATE
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
              Quiz {quizNumber} • {quiz.questionCount || 10} Questions • Pass Mark: {quiz.passMark}%
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
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ fontWeight: 600, color: "#16B978" }}>
                Pass Mark: {quiz.passMark}%
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

  // 3. FAILED STATE (FAILED / EXHAUSTED / RETRYABLE)
  const isFailed = quiz.status === "FAILED" || quiz.status === "FAILED_RETRYABLE" || quiz.status === "FAILED_EXHAUSTED" || isExhausted || isRetryable;

  if (isFailed) {
    return (
      <div
        className="student-quiz-card failed"
        style={{
          background: "#FFFFFF",
          border: "1px solid #FCA5A5",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.04)",
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
              color: "#EF4444",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5D78A3", marginTop: "6px" }}>
              <span style={{ fontWeight: 600, color: "#EF4444" }}>
                Attempt {attemptsUsed} of {maxAttempts} Used
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FileText size={15} color="#5D78A3" />
                {quiz.questionCount || 10} Questions
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
              <span style={{ fontWeight: 600, color: "#0B1F3A" }}>
                Pass Mark: {quiz.passMark}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {quiz.highRiskWarning && (
            <span
              style={{
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: "12px",
                fontWeight: "600",
                padding: "6px 12px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldAlert size={14} color="#DC2626" />
              High Risk Notice
            </span>
          )}

          <span
            style={{
              background: "#FEF2F2",
              color: "#EF4444",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Failed
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

  // 5. IN_PROGRESS STATE
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
              <span style={{ fontWeight: 600, color: "#126BFF" }}>
                Attempt {currentAttemptNumber} of {maxAttempts}
              </span>
              <span style={{ color: "#DCE6F3" }}>|</span>
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

  // 6. DEFAULT AVAILABLE STATE
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
            <span style={{ fontWeight: 600, color: "#6C4BFF" }}>
              Attempt 1 of {maxAttempts}
            </span>
            <span style={{ color: "#DCE6F3" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FileText size={15} color="#5D78A3" />
              {quiz.questionCount || 10} Questions
            </span>
            <span style={{ color: "#DCE6F3" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={15} color="#5D78A3" />
              {quiz.durationMinutes || 10} Minutes
            </span>
            <span style={{ color: "#DCE6F3" }}>|</span>
            <span style={{ fontWeight: 600, color: "#0B1F3A" }}>
              Pass Mark: {quiz.passMark}%
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

