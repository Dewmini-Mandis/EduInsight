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

  // 3. EXHAUSTED ATTEMPTS & REMEDIATION WORKFLOW STATE
  if (isExhausted) {
    const requiredMaterials = quiz.requiredMaterials || [];
    const allCompleted = quiz.allMaterialsCompleted ?? requiredMaterials.every(m => m.is_completed);
    const isEscalated = quiz.remediationState === "ESCALATED_TEACHER";

    return (
      <div
        className="student-quiz-card exhausted-remediation"
        style={{
          background: "#FFFFFF",
          border: isEscalated ? "1.5px solid #FF4054" : "1.5px solid #F59E0B",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(245, 158, 11, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: isEscalated ? "#FEF2F2" : "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEscalated ? "#FF4054" : "#D97706",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} color={isEscalated ? "#FF4054" : "#D97706"} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                {quiz.title}
              </h3>
              <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
                Attempt {attemptsUsed} of {maxAttempts} Ordinary Attempts Used • Pass Mark: {quiz.passMark}%
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                High Risk Warning
              </span>
            )}

            <span
              style={{
                background: isEscalated ? "#FEF2F2" : "#FEF3C7",
                color: isEscalated ? "#991B1B" : "#B45309",
                fontSize: "13px",
                fontWeight: "700",
                padding: "6px 14px",
                borderRadius: "20px",
              }}
            >
              {isEscalated ? "Teacher Escalation Pending" : "Attempts Exhausted – Remediation Required"}
            </span>
          </div>
        </div>

        {/* Required Remediation Materials List */}
        {requiredMaterials.length > 0 && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: "700", color: "#1E293B", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={16} color="#6C4BFF" />
              Mandatory Remedial Materials (Complete all to unlock Post-Remedial Reassessment):
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {requiredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {mat.is_completed ? (
                      <CheckSquare size={18} color="#16B978" />
                    ) : (
                      <Clock size={18} color="#D97706" />
                    )}
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                      {mat.title} ({mat.material_type})
                    </span>
                  </div>

                  {mat.is_completed ? (
                    <span style={{ background: "#E9FBF4", color: "#16B978", fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "12px" }}>
                      Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/student/materials/${mat.id}`)}
                      style={{
                        background: "#EDF2F7",
                        color: "#2563EB",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      View Material <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reassessment Button Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
          <button
            type="button"
            className="student-btn-secondary"
            style={{ height: "42px", padding: "0 16px" }}
            onClick={() => onViewResults(quiz)}
          >
            View Diagnostic Results
          </button>

          {isEscalated ? (
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#991B1B" }}>
              Reassessment failed. A teacher will review diagnostic evidence and provide support.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {!allCompleted && (
                <span style={{ fontSize: "12px", color: "#64748B", fontWeight: "500" }}>
                  Complete all materials above to unlock reassessment.
                </span>
              )}
              <button
                type="button"
                className="student-btn-primary"
                disabled={!allCompleted}
                style={{
                  height: "44px",
                  padding: "0 22px",
                  opacity: allCompleted ? 1 : 0.5,
                  cursor: allCompleted ? "pointer" : "not-allowed",
                  background: allCompleted ? "#16B978" : "#94A3B8",
                  borderColor: allCompleted ? "#16B978" : "#94A3B8",
                }}
                onClick={() => allCompleted && onStartQuiz(quiz, true)}
              >
                Start Reassessment
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. ORDINARY RETAKE STATE (FAILED_RETRYABLE: Attempt X of Y with attempts remaining)
  if (isRetryable) {
    return (
      <div
        className="student-quiz-card retryable"
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
              <span style={{ fontWeight: 600, color: "#D97706" }}>
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
              background: "#FEF3C7",
              color: "#B45309",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "20px",
            }}
          >
            Attempt {currentAttemptNumber} of {maxAttempts} Available
          </span>

          <button
            type="button"
            className="student-btn-primary"
            style={{ height: "44px", padding: "0 22px" }}
            onClick={() => onStartQuiz(quiz)}
          >
            Retake Quiz
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

