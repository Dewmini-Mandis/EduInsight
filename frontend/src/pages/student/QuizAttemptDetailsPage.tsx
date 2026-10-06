import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  FileText,
  AlertTriangle,
  TrendingUp,
  Award,
} from "lucide-react";
import ProgressHeader from "../../components/student/progress/ProgressHeader";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

interface QuizAttemptRaw {
  id: number;
  quiz: number;
  quiz_title?: string;
  attempt_number: number;
  attempt_type?: "ORDINARY" | "REASSESSMENT";
  start_time: string;
  end_time?: string;
  expires_at?: string;
  status: string;
  auto_submitted?: boolean;
  score: number | null;
  answers?: Array<{
    id: number;
    question: number;
    selected_answer: number | null;
    typed_answer: string | null;
    is_correct: boolean;
  }>;
  attempt_questions?: Array<{
    id: number;
    question: number;
    order: number;
  }>;
}

interface QuizRaw {
  id: number;
  title: string;
  pass_mark: number;
  max_attempts?: number;
  lesson_title?: string;
  term_name?: string;
}

const QuizAttemptDetailsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quizInfo, setQuizInfo] = useState<QuizRaw | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptRaw[]>([]);

  useEffect(() => {
    if (quizId) {
      fetchAttemptDetails();
    }
  }, [quizId]);

  const fetchAttemptDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers = { Authorization: `Token ${token}` };

      const [attemptsRes, quizRes] = await Promise.all([
        fetch(`/api/attempts/attempts/?quiz=${quizId}`, { headers }),
        fetch(`/api/quizzes/${quizId}/`, { headers }),
      ]);

      if (!attemptsRes.ok) throw new Error("Failed to load attempt details.");

      const rawAttemptsData = await attemptsRes.json();
      const attemptsData: QuizAttemptRaw[] = Array.isArray(rawAttemptsData)
        ? rawAttemptsData
        : rawAttemptsData?.results || [];

      const rawQuizData = quizRes.ok ? await quizRes.json() : null;
      const quizData: QuizRaw = rawQuizData;

      setAttempts(attemptsData);
      if (quizData) {
        setQuizInfo(quizData);
      }
    } catch (err: any) {
      console.error("Error loading attempt details:", err);
      setError(err.message || "Failed to load attempt details.");
    } finally {
      setLoading(false);
    }
  };

  const safeAttempts = Array.isArray(attempts) ? attempts : (attempts as any)?.results || [];

  // Separate ordinary finalized attempts, in-progress attempts, and reassessments
  const ordinaryFinalized = safeAttempts
    .filter(
      (a: QuizAttemptRaw) =>
        (!a.attempt_type || a.attempt_type === "ORDINARY") &&
        (a.status === "SUBMITTED" || a.status === "EXPIRED")
    )
    .sort((a: QuizAttemptRaw, b: QuizAttemptRaw) => a.attempt_number - b.attempt_number); // Chronological order (Attempt 1, Attempt 2...)

  const inProgressAttempt = safeAttempts.find(
    (a: QuizAttemptRaw) => (!a.attempt_type || a.attempt_type === "ORDINARY") && a.status === "IN_PROGRESS"
  );

  const reassessmentAttempts = safeAttempts
    .filter((a: QuizAttemptRaw) => a.attempt_type === "REASSESSMENT")
    .sort((a: QuizAttemptRaw, b: QuizAttemptRaw) => a.attempt_number - b.attempt_number);

  const passMark = quizInfo?.pass_mark ?? 60;
  const isOverallPassed = ordinaryFinalized.some((a: QuizAttemptRaw) => (a.score ?? 0) >= passMark);

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1280px", margin: "0 auto" }}>
      <button
        type="button"
        className="student-btn-secondary"
        style={{
          marginBottom: "16px",
          padding: "6px 12px",
          fontSize: "13px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
        onClick={() => navigate("/student/progress/history")}
      >
        <ArrowLeft size={16} />
        <span>Back to Quiz History</span>
      </button>

      {loading ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center" }}>
          <div className="student-loading-spinner" style={{ margin: "0 auto 16px auto" }} />
          <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Loading attempt details...</p>
        </div>
      ) : error ? (
        <div className="student-card" style={{ padding: "32px", borderColor: "#FF4054" }}>
          <p style={{ color: "#FF4054", fontWeight: 600, margin: 0 }}>{error}</p>
          <button
            type="button"
            className="student-btn-primary"
            style={{ marginTop: "16px" }}
            onClick={fetchAttemptDetails}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Header Card */}
          <ProgressHeader
            title={quizInfo?.title || `Quiz #${quizId}`}
            subtitle={`${quizInfo?.term_name || "Term 1"} \u2022 Lesson: ${
              quizInfo?.lesson_title || "General Lesson"
            }`}
            rightAction={
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: isOverallPassed ? "#E9FBF4" : "#FFF1F3",
                    color: isOverallPassed ? "#16B978" : "#FF4054",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isOverallPassed ? (
                    <>
                      <CheckCircle2 size={16} /> Passed Quiz
                    </>
                  ) : (
                    <>
                      <XCircle size={16} /> Passing Mark Not Met
                    </>
                  )}
                </span>
              </div>
            }
          />

          {/* Remedial / Reassessment Banner if applicable */}
          {reassessmentAttempts.length > 0 && (
            <div
              className="student-card"
              style={{
                marginTop: "20px",
                padding: "16px 20px",
                background: "#F1EDFF",
                borderColor: "#6C4BFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <TrendingUp size={22} color="#6C4BFF" />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0B1F3A" }}>
                    Learning Improvement & Reassessment Available
                  </div>
                  <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                    You have completed remedial learning and post-remedial reassessment for this quiz.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="student-btn-primary"
                style={{ background: "#6C4BFF", padding: "8px 16px", fontSize: "13px" }}
                onClick={() => navigate(`/student/progress/remediation?quiz=${quizId}`)}
              >
                View Remedial History
              </button>
            </div>
          )}

          {/* Active / In Progress Draft Section */}
          {inProgressAttempt && (
            <div
              className="student-card"
              style={{
                marginTop: "24px",
                padding: "24px 28px",
                borderColor: "#126BFF",
                background: "#EAF3FF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: "#126BFF",
                        color: "#FFFFFF",
                      }}
                    >
                      IN PROGRESS DRAFT
                    </span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0B1F3A" }}>
                      Attempt #{inProgressAttempt.attempt_number}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px", margin: "4px 0 0 0" }}>
                    Started on{" "}
                    {new Date(inProgressAttempt.start_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  className="student-btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                  onClick={() => navigate(`/student/quizzes/${quizId}/attempt`)}
                >
                  <Play size={16} />
                  <span>Resume Quiz</span>
                </button>
              </div>
            </div>
          )}

          {/* Finalized Ordinary Attempts Header */}
          <div style={{ marginTop: "32px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
              Finalized Ordinary Attempts
            </h3>
            <p style={{ fontSize: "13px", color: "#5D78A3", margin: "2px 0 0 0" }}>
              Each ordinary attempt is listed in chronological order below.
            </p>
          </div>

          {ordinaryFinalized.length === 0 ? (
            <div className="student-card" style={{ padding: "36px", textAlign: "center", color: "#5D78A3" }}>
              No finalized ordinary attempts found for this quiz yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {ordinaryFinalized.map((att: QuizAttemptRaw) => {
                const totalQuestions =
                  att.attempt_questions?.length || att.answers?.length || 0;
                const correctCount = att.answers?.filter((a: any) => a.is_correct).length || 0;
                const answeredCount =
                  att.answers?.filter(
                    (a: any) => a.selected_answer !== null || (a.typed_answer && a.typed_answer.trim() !== "")
                  ).length || 0;
                const incorrectCount =
                  att.answers?.filter(
                    (a: any) =>
                      (a.selected_answer !== null || (a.typed_answer && a.typed_answer.trim() !== "")) &&
                      !a.is_correct
                  ).length || 0;
                const unansweredCount = Math.max(0, totalQuestions - answeredCount);

                const isAttemptPassed = (att.score ?? 0) >= passMark;
                const isTimeExpired = att.auto_submitted || att.status === "EXPIRED";

                const startDate = new Date(att.start_time);
                const endDate = att.end_time ? new Date(att.end_time) : startDate;
                const timeTakenSec = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
                const mins = Math.floor(timeTakenSec / 60);
                const secs = timeTakenSec % 60;
                const timeTakenStr = `${mins}m ${secs}s`;

                const completionDateStr = endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={att.id}
                    className="student-card"
                    style={{
                      padding: "24px 28px",
                      position: "relative",
                    }}
                  >
                    {/* Card Top Title Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: "16px",
                        borderBottom: "1px solid #DCE6F3",
                        marginBottom: "20px",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: "#EAF3FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            color: "#126BFF",
                            fontSize: "14px",
                          }}
                        >
                          #{att.attempt_number}
                        </div>
                        <div>
                          <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
                            Attempt {att.attempt_number}
                          </h4>
                          <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                            Completed on {completionDateStr}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isTimeExpired && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "#FFF8E6",
                              color: "#D97706",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <AlertTriangle size={13} /> Time Expired
                          </span>
                        )}

                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: isAttemptPassed ? "#E9FBF4" : "#FFF1F3",
                            color: isAttemptPassed ? "#16B978" : "#FF4054",
                          }}
                        >
                          {isAttemptPassed ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "16px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          background: "#F5F8FC",
                          padding: "12px 16px",
                          borderRadius: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>Score</div>
                        <div
                          style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: isAttemptPassed ? "#16B978" : "#FF4054",
                            marginTop: "2px",
                          }}
                        >
                          {att.score ?? 0}%
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#F5F8FC",
                          padding: "12px 16px",
                          borderRadius: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>Correct Answers</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#16B978", marginTop: "2px" }}>
                          {correctCount} / {totalQuestions}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#F5F8FC",
                          padding: "12px 16px",
                          borderRadius: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>Incorrect Answers</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#FF4054", marginTop: "2px" }}>
                          {incorrectCount}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#F5F8FC",
                          padding: "12px 16px",
                          borderRadius: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>Unanswered</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#5D78A3", marginTop: "2px" }}>
                          {unansweredCount}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#F5F8FC",
                          padding: "12px 16px",
                          borderRadius: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>Time Taken</div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#0B1F3A",
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Clock size={14} color="#5D78A3" />
                          <span>{timeTakenStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="student-btn-primary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "9px 20px",
                          fontSize: "14px",
                        }}
                        onClick={() =>
                          navigate(`/student/quizzes/${quizId}/results/${att.id}/review`)
                        }
                      >
                        <FileText size={16} />
                        <span>Review Answers</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuizAttemptDetailsPage;
