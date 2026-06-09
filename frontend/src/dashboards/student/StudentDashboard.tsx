import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type CurrentUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  school_id?: number | null;
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser() as CurrentUser | null;

  // Tabs: "progress" (My Progress & History) | "quizzes" (Assigned Quizzes) | "recommendations"
  const [activeSection, setActiveSection] = useState<"progress" | "quizzes" | "recommendations">(
    "progress"
  );
  // quizAction: "list" | "attempt" | "result" | "history_detail"
  const [quizAction, setQuizAction] = useState<"list" | "attempt" | "result" | "history_detail">("list");

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<number, { selected_answer?: number; typed_answer?: string }>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fullName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim();
  const displayName = fullName || "Student";
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "ST";

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      // Fetch available quizzes
      const quizRes = await fetch("/api/quizzes/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!quizRes.ok) throw new Error("Unable to fetch quizzes");
      const quizData = await quizRes.json();
      setQuizzes(quizData);

      // Fetch attempts history
      const attemptRes = await fetch("/api/attempts/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!attemptRes.ok) throw new Error("Unable to fetch attempts");
      const attemptData = await attemptRes.json();
      setAttempts(attemptData);
    } catch (err: any) {
      setError(err.message || "Something went wrong while fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats for metrics
  const stats = useMemo(() => {
    const completedQuizIds = new Set(attempts.map((att) => att.quiz));
    const averageScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, att) => sum + (att.score || 0), 0) / attempts.length)
        : 0;

    return {
      completedCount: completedQuizIds.size,
      avgScore: averageScore,
      recommendationsCount: quizzes.length > 0 ? 3 : 0,
    };
  }, [attempts, quizzes]);

  const handleStartAttempt = (quiz: any) => {
    setSelectedQuiz(quiz);
    setAttemptAnswers({});
    setError("");
    setSuccessMessage("");
    setQuizAction("attempt");
  };

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setAttemptAnswers((prev) => ({
      ...prev,
      [questionId]: { selected_answer: answerId },
    }));
  };

  const handleTypedAnswerChange = (questionId: number, val: string) => {
    setAttemptAnswers((prev) => ({
      ...prev,
      [questionId]: { typed_answer: val },
    }));
  };

  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setError("");
    setActionLoading(true);

    try {
      const token = getToken();
      const payload = {
        quiz: selectedQuiz.id,
        answers: selectedQuiz.questions.map((q: any) => {
          return {
            question: q.id,
            selected_answer: attemptAnswers[q.id]?.selected_answer || null,
            typed_answer: attemptAnswers[q.id]?.typed_answer || "",
            hint_count: hintsUsed[q.id] || 0,
          };
        }),
      };

      const res = await fetch("/api/attempts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || "Unable to submit your answers.");
      }

      const resultData = await res.json();
      setSelectedAttempt(resultData);
      setSuccessMessage("Quiz submitted successfully!");
      setQuizAction("result");
      // refresh attempts
      const attemptRes = await fetch("/api/attempts/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (attemptRes.ok) {
        const attemptData = await attemptRes.json();
        setAttempts(attemptData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit attempt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAttemptDetails = (attempt: any) => {
    setSelectedAttempt(attempt);
    // Find the full quiz info so we can reference the questions list
    const quizInfo = quizzes.find((q) => q.id === attempt.quiz);
    setSelectedQuiz(quizInfo || null);
    setQuizAction("history_detail");
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div>
              <div className="admin-brand-title">EduInsight</div>
              <div className="admin-brand-sub">STUDENT</div>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeSection === "progress" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveSection("progress");
                setQuizAction("list");
                setSelectedAttempt(null);
                setSelectedQuiz(null);
              }}
            >
              My Progress
            </button>
            <button
              className={`admin-nav-item ${activeSection === "quizzes" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveSection("quizzes");
                setQuizAction("list");
                setSelectedAttempt(null);
                setSelectedQuiz(null);
              }}
            >
              Assigned Quizzes
            </button>
            <button
              className={`admin-nav-item ${activeSection === "recommendations" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveSection("recommendations");
                setQuizAction("list");
                setSelectedAttempt(null);
                setSelectedQuiz(null);
              }}
            >
              Recommendations
            </button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{initials}</div>
            <div>
              <div className="admin-user-name">{displayName}</div>
              <div className="admin-user-email">
                {currentUser?.email || "student@school.edu.lk"}
              </div>
            </div>
          </div>
          <button
            className="admin-ghost-btn"
            type="button"
            onClick={() => navigate("/logout")}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <div className="admin-title">
              {activeSection === "progress"
                ? "Learning Progress"
                : activeSection === "quizzes"
                ? "Quiz Management"
                : "Personalized Recommendations"}
            </div>
            <div className="admin-subtitle">
              {activeSection === "progress"
                ? "View quiz results, track progress, and follow recommended lessons."
                : activeSection === "quizzes"
                ? "Take assigned quizzes and review your performance."
                : "Tailored educational content to boost your understanding."}
            </div>
          </div>
        </header>

        {/* Dynamic metrics cards using admin-metrics-grid to match Admin look and feel */}
        {activeSection === "progress" && (
          <section className="admin-metrics-grid admin-metrics-grid--three" style={{ marginBottom: "2rem" }}>
            <div className="metric-card">
              <div className="metric-title">Completed Quizzes</div>
              <div className="metric-value">{loading ? "--" : stats.completedCount}</div>
              <div className="metric-badge">All-time attempts</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Average Score</div>
              <div className="metric-value">{loading ? "--" : `${stats.avgScore}%`}</div>
              <div className="metric-badge">Across all quizzes</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Recommended Lessons</div>
              <div className="metric-value">{loading ? "--" : stats.recommendationsCount}</div>
              <div className="metric-badge">AI-driven topics</div>
            </div>
          </section>
        )}

        {successMessage && (
          <div className="admin-success" style={{ marginBottom: "1.5rem" }} role="status">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="admin-error" style={{ marginBottom: "1.5rem" }} role="status">
            {error}
          </div>
        )}

        <section className="admin-content-grid admin-content-grid--single">
          {activeSection === "progress" && (
            quizAction === "history_detail" && selectedAttempt ? (
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">
                      Review Quiz: {selectedQuiz?.title || "Attempt Details"}
                    </div>
                    <div className="admin-card-subtitle">
                      {selectedAttempt?.start_time ? `Attempted on ${new Date(selectedAttempt.start_time).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <button
                    className="admin-secondary-btn"
                    onClick={() => {
                      setQuizAction("list");
                      setSelectedQuiz(null);
                      setSelectedAttempt(null);
                    }}
                    style={{ width: "auto", padding: "8px 16px" }}
                  >
                    &larr; Back to History
                  </button>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      textAlign: "center",
                      marginBottom: "2rem",
                      border: "1px solid var(--admin-border)",
                    }}
                  >
                    <div style={{ fontSize: "1rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
                      Historical Attempt Details
                    </div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "800",
                        color: selectedAttempt.score >= 50 ? "#15803d" : "#b91c1c",
                        lineHeight: 1,
                        margin: "0.5rem 0",
                      }}
                    >
                      {selectedAttempt.score}%
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Attempt #{selectedAttempt.attempt_number} &bull; Taken on {new Date(selectedAttempt.start_time).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem" }}>
                    Questions Review
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selectedQuiz ? (
                      selectedQuiz.questions?.map((q: any, idx: number) => {
                        const userAns = selectedAttempt.answers?.find((a: any) => a.question === q.id);
                        return (
                          <div
                            key={q.id}
                            style={{
                              background: "white",
                              border: "1px solid var(--admin-border)",
                              borderRadius: "10px",
                              padding: "14px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontWeight: "700", fontSize: "12px", color: "#64748b" }}>
                                Question #{idx + 1}
                              </span>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {userAns?.hint_count > 0 && (
                                  <span className="status-pill status-active" style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#d97706" }}>
                                    {userAns.hint_count} Hints Used (-{userAns.hint_count * 25}%)
                                  </span>
                                )}
                                <span
                                  className={`status-pill ${userAns?.is_correct ? "status-active" : "status-suspended"}`}
                                  style={{ fontSize: "11px", padding: "2px 8px" }}
                                >
                                  {userAns?.is_correct ? "Correct" : "Incorrect"}
                                </span>
                              </div>
                            </div>

                            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>
                              {q.question_text}
                            </div>

                            {q.question_type === "MCQ" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {q.answers?.map((ans: any) => {
                                  const isUserChoice = userAns?.selected_answer === ans.id;
                                  return (
                                    <div
                                      key={ans.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid",
                                        borderColor: ans.is_correct
                                          ? "#bbf7d0"
                                          : isUserChoice
                                          ? "#fca5a5"
                                          : "transparent",
                                        background: ans.is_correct
                                          ? "#f0fdf4"
                                          : isUserChoice
                                          ? "#fef2f2"
                                          : "transparent",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "bold",
                                          color: ans.is_correct ? "#16a34a" : isUserChoice ? "#dc2626" : "#cbd5e1",
                                        }}
                                      >
                                        {ans.is_correct ? "✓" : isUserChoice ? "✗" : "○"}
                                      </span>
                                      <span style={{ fontSize: "13px", color: ans.is_correct ? "#14532d" : "inherit" }}>
                                        {ans.answer_text}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                                <div>
                                  <span style={{ color: "#64748b" }}>Your Answer:</span>{" "}
                                  <strong style={{ color: userAns?.is_correct ? "#16a34a" : "#dc2626" }}>
                                    {userAns?.typed_answer || "(None)"}
                                  </strong>
                                </div>
                                {!userAns?.is_correct && (
                                  <div>
                                    <span style={{ color: "#64748b" }}>Correct Value:</span>{" "}
                                    <strong style={{ color: "#16a34a" }}>
                                      {q.correct_value}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="admin-empty">Full question details are not available for this quiz.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">Attempt History</div>
                    <div className="admin-card-subtitle">Chronological record of your past quizzes.</div>
                  </div>
                </div>
                
                <div className="admin-table">
                  <div className="admin-table-header" style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr" }}>
                    <span>Quiz Title</span>
                    <span>Attempt No</span>
                    <span>Date & Time</span>
                    <span>Score</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading history...</div>}
                  {!loading && attempts.length === 0 && (
                    <div className="admin-empty">You haven't completed any quizzes yet.</div>
                  )}
                  {!loading && attempts.map((att) => (
                    <div className="admin-table-row" key={att.id} style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr" }}>
                      <div>
                        <strong className="user-name">{att.quiz_title}</strong>
                      </div>
                      <div className="user-meta">Attempt #{att.attempt_number}</div>
                      <div className="user-meta">{new Date(att.start_time).toLocaleString()}</div>
                      <div>
                        <span className={`status-pill ${att.score >= 50 ? "status-active" : "status-suspended"}`}>
                          {att.score}%
                        </span>
                      </div>
                      <div className="admin-actions">
                        <button
                          className="admin-action-btn"
                          type="button"
                          onClick={() => handleViewAttemptDetails(att)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {activeSection === "quizzes" && (
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-title">
                    {quizAction === "attempt"
                      ? `Taking Quiz: ${selectedQuiz?.title}`
                      : quizAction === "result"
                      ? `Results: ${selectedQuiz?.title}`
                      : quizAction === "history_detail"
                      ? `Review Quiz: ${selectedQuiz?.title || "Attempt Details"}`
                      : "Assigned Quizzes"}
                  </div>
                  <div className="admin-card-subtitle">
                    {quizAction === "attempt"
                      ? selectedQuiz?.description || "Select the correct options and input correct answers."
                      : quizAction === "result"
                      ? "Here is how you performed in this attempt."
                      : quizAction === "history_detail"
                      ? selectedAttempt?.start_time ? `Attempted on ${new Date(selectedAttempt.start_time).toLocaleString()}` : ""
                      : "List of quizzes available for you to answer."}
                  </div>
                </div>
                {quizAction !== "list" && (
                  <button
                    className="admin-secondary-btn"
                    onClick={() => {
                      setQuizAction("list");
                      setSelectedQuiz(null);
                      setSelectedAttempt(null);
                      setError("");
                      setSuccessMessage("");
                    }}
                    style={{ width: "auto", padding: "8px 16px" }}
                  >
                    &larr; Back to Quizzes
                  </button>
                )}
              </div>

              {quizAction === "list" && (
                <div className="admin-table">
                  <div className="admin-table-header" style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr" }}>
                    <span>Quiz Title</span>
                    <span>School Scope</span>
                    <span>Questions</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading quizzes...</div>}
                  {!loading && quizzes.length === 0 && (
                    <div className="admin-empty">No quizzes assigned to your class/school.</div>
                  )}
                  {!loading && quizzes.map((quiz) => {
                    const attemptsCount = attempts.filter((att) => att.quiz === quiz.id).length;
                    const maxAttempts = quiz.max_attempts || 3;
                    const isLimitReached = attemptsCount >= maxAttempts;
                    return (
                      <div className="admin-table-row" key={quiz.id} style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr" }}>
                        <div>
                          <strong className="user-name">{quiz.title}</strong>
                          <div className="user-meta">{quiz.description || "No description"}</div>
                        </div>
                        <div className="user-meta">{quiz.school_name || "National (All Schools)"}</div>
                        <div className="user-meta">
                          <div>{quiz.questions?.length || 0} Questions</div>
                          <div className="user-meta" style={{ fontSize: "11px", color: isLimitReached ? "var(--admin-danger)" : "#64748b" }}>
                            Attempts: {attemptsCount} / {maxAttempts}
                          </div>
                        </div>
                        <div className="admin-actions">
                          <button
                            className="admin-action-btn"
                            type="button"
                            onClick={() => handleStartAttempt(quiz)}
                            disabled={isLimitReached}
                            style={isLimitReached ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                            title={isLimitReached ? "Attempt limit reached for this quiz" : ""}
                          >
                            {isLimitReached ? "Locked" : "Start Quiz"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {quizAction === "attempt" && selectedQuiz && (
                <form className="admin-form" onSubmit={handleSubmitAttempt} style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {selectedQuiz.questions?.map((q: any, qIdx: number) => (
                      <div
                        key={q.id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid var(--admin-border)",
                          borderRadius: "10px",
                          padding: "16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                          <span style={{ fontWeight: "700", fontSize: "13px", color: "var(--admin-sidebar)" }}>
                            Question #{qIdx + 1}
                          </span>
                          <span className="status-pill status-active" style={{ fontSize: "11px", padding: "2px 8px" }}>
                            {q.difficulty_level || "Medium"}
                          </span>
                        </div>
                        <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "1rem" }}>
                          {q.question_text}
                        </div>

                        {q.question_type === "MCQ" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {q.answers?.map((ans: any) => (
                              <label
                                key={ans.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "10px 14px",
                                  border: "1px solid var(--admin-border)",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  background:
                                    attemptAnswers[q.id]?.selected_answer === ans.id
                                      ? "#eff6ff"
                                      : "white",
                                  borderColor:
                                    attemptAnswers[q.id]?.selected_answer === ans.id
                                      ? "var(--admin-accent)"
                                      : "var(--admin-border)",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  checked={attemptAnswers[q.id]?.selected_answer === ans.id}
                                  onChange={() => handleAnswerSelect(q.id, ans.id)}
                                  style={{ cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "14px" }}>{ans.answer_text}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="admin-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                              Your Answer
                            </label>
                            <input
                              type="text"
                              placeholder="Type your numeric answer here"
                              value={attemptAnswers[q.id]?.typed_answer || ""}
                              onChange={(e) => handleTypedAnswerChange(q.id, e.target.value)}
                              required
                            />
                          </div>
                        )}

                        {/* Question Hints UI block */}
                        {q.hints && q.hints.length > 0 && (
                          <div style={{ marginTop: "15px", borderTop: "1px dashed var(--admin-border)", paddingTop: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                                Need help? (Each hint used reduces question score by 25%)
                              </span>
                              <button
                                type="button"
                                className="admin-secondary-btn"
                                onClick={() => {
                                  const currentCount = hintsUsed[q.id] || 0;
                                  if (currentCount < q.hints.length) {
                                    setHintsUsed(prev => ({ ...prev, [q.id]: currentCount + 1 }));
                                  }
                                }}
                                disabled={(hintsUsed[q.id] || 0) >= q.hints.length}
                                style={{ width: "auto", padding: "4px 10px", fontSize: "11px", height: "auto" }}
                              >
                                {(hintsUsed[q.id] || 0) >= q.hints.length ? "No hints left" : "Get Hint"}
                              </button>
                            </div>
                            
                            {Array.from({ length: hintsUsed[q.id] || 0 }).map((_, hIdx) => {
                              const hintObj = q.hints.find((h: any) => h.sequence_no === hIdx + 1) || q.hints[hIdx];
                              return (
                                <div
                                  key={hIdx}
                                  style={{
                                    background: "#fef3c7",
                                    border: "1px solid #fde68a",
                                    borderRadius: "6px",
                                    padding: "8px 12px",
                                    fontSize: "13px",
                                    color: "#78350f",
                                    marginBottom: "6px",
                                    display: "flex",
                                    gap: "6px"
                                  }}
                                >
                                  <strong>Hint #{hIdx + 1}:</strong>
                                  <span>{hintObj?.hint_text}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="admin-modal-actions" style={{ marginTop: "2rem" }}>
                    <button
                      className="admin-secondary-btn"
                      type="button"
                      onClick={() => setQuizAction("list")}
                    >
                      Cancel
                    </button>
                    <button
                      className="admin-primary-btn"
                      type="submit"
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Submitting..." : "Submit Quiz"}
                    </button>
                  </div>
                </form>
              )}

              {quizAction === "result" && selectedAttempt && (
                <div style={{ padding: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                      borderRadius: "16px",
                      padding: "2rem",
                      textAlign: "center",
                      marginBottom: "2rem",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.5rem" }}>
                      Quiz Attempt Score
                    </div>
                    <div
                      style={{
                        fontSize: "3.5rem",
                        fontWeight: "800",
                        color: selectedAttempt.score >= 50 ? "#15803d" : "#b91c1c",
                        lineHeight: 1,
                        margin: "0.5rem 0",
                      }}
                    >
                      {selectedAttempt.score}%
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#1e3a8a", fontWeight: "500" }}>
                      Attempt #{selectedAttempt.attempt_number} &bull; Completed successfully
                    </div>
                  </div>

                  <div style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem" }}>
                    Answer Breakdown
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selectedQuiz?.questions?.map((q: any, idx: number) => {
                      const userAns = selectedAttempt.answers?.find((a: any) => a.question === q.id);
                      return (
                        <div
                          key={q.id}
                          style={{
                            background: "white",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "10px",
                            padding: "14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontWeight: "700", fontSize: "12px", color: "#64748b" }}>
                              Question #{idx + 1}
                            </span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {userAns?.hint_count > 0 && (
                                <span className="status-pill status-active" style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#d97706" }}>
                                  {userAns.hint_count} Hints Used (-{userAns.hint_count * 25}%)
                                </span>
                              )}
                              <span
                                className={`status-pill ${userAns?.is_correct ? "status-active" : "status-suspended"}`}
                                style={{ fontSize: "11px", padding: "2px 8px" }}
                              >
                                {userAns?.is_correct ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>
                            {q.question_text}
                          </div>

                          {q.question_type === "MCQ" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {q.answers?.map((ans: any) => {
                                const isUserChoice = userAns?.selected_answer === ans.id;
                                return (
                                  <div
                                    key={ans.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: "1px solid",
                                      borderColor: ans.is_correct
                                        ? "#bbf7d0"
                                        : isUserChoice
                                        ? "#fca5a5"
                                        : "transparent",
                                      background: ans.is_correct
                                        ? "#f0fdf4"
                                        : isUserChoice
                                        ? "#fef2f2"
                                        : "transparent",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        color: ans.is_correct ? "#16a34a" : isUserChoice ? "#dc2626" : "#cbd5e1",
                                      }}
                                    >
                                      {ans.is_correct ? "✓" : isUserChoice ? "✗" : "○"}
                                    </span>
                                    <span style={{ fontSize: "13px", color: ans.is_correct ? "#14532d" : "inherit" }}>
                                      {ans.answer_text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                              <div>
                                <span style={{ color: "#64748b" }}>Your Answer:</span>{" "}
                                <strong style={{ color: userAns?.is_correct ? "#16a34a" : "#dc2626" }}>
                                  {userAns?.typed_answer || "(None)"}
                                </strong>
                              </div>
                              {!userAns?.is_correct && (
                                <div>
                                  <span style={{ color: "#64748b" }}>Correct Value:</span>{" "}
                                  <strong style={{ color: "#16a34a" }}>
                                    {q.correct_value}
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "2rem" }}>
                    <button
                      className="admin-primary-btn"
                      onClick={() => {
                        setQuizAction("list");
                        setSelectedQuiz(null);
                        setSelectedAttempt(null);
                        setError("");
                        setSuccessMessage("");
                      }}
                    >
                      Return to Quiz List
                    </button>
                  </div>
                </div>
              )}

              {quizAction === "history_detail" && selectedAttempt && (
                <div style={{ padding: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      textAlign: "center",
                      marginBottom: "2rem",
                      border: "1px solid var(--admin-border)",
                    }}
                  >
                    <div style={{ fontSize: "1rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
                      Historical Attempt Details
                    </div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "800",
                        color: selectedAttempt.score >= 50 ? "#15803d" : "#b91c1c",
                        lineHeight: 1,
                        margin: "0.5rem 0",
                      }}
                    >
                      {selectedAttempt.score}%
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Attempt #{selectedAttempt.attempt_number} &bull; Taken on {new Date(selectedAttempt.start_time).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem" }}>
                    Questions Review
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selectedQuiz ? (
                      selectedQuiz.questions?.map((q: any, idx: number) => {
                        const userAns = selectedAttempt.answers?.find((a: any) => a.question === q.id);
                        return (
                          <div
                            key={q.id}
                            style={{
                              background: "white",
                              border: "1px solid var(--admin-border)",
                              borderRadius: "10px",
                              padding: "14px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontWeight: "700", fontSize: "12px", color: "#64748b" }}>
                                Question #{idx + 1}
                              </span>
                              <span
                                className={`status-pill ${userAns?.is_correct ? "status-active" : "status-suspended"}`}
                                style={{ fontSize: "11px", padding: "2px 8px" }}
                              >
                                {userAns?.is_correct ? "Correct" : "Incorrect"}
                              </span>
                            </div>

                            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>
                              {q.question_text}
                            </div>

                            {q.question_type === "MCQ" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {q.answers?.map((ans: any) => {
                                  const isUserChoice = userAns?.selected_answer === ans.id;
                                  return (
                                    <div
                                      key={ans.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid",
                                        borderColor: ans.is_correct
                                          ? "#bbf7d0"
                                          : isUserChoice
                                          ? "#fca5a5"
                                          : "transparent",
                                        background: ans.is_correct
                                          ? "#f0fdf4"
                                          : isUserChoice
                                          ? "#fef2f2"
                                          : "transparent",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "bold",
                                          color: ans.is_correct ? "#16a34a" : isUserChoice ? "#dc2626" : "#cbd5e1",
                                        }}
                                      >
                                        {ans.is_correct ? "✓" : isUserChoice ? "✗" : "○"}
                                      </span>
                                      <span style={{ fontSize: "13px", color: ans.is_correct ? "#14532d" : "inherit" }}>
                                        {ans.answer_text}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                                <div>
                                  <span style={{ color: "#64748b" }}>Your Answer:</span>{" "}
                                  <strong style={{ color: userAns?.is_correct ? "#16a34a" : "#dc2626" }}>
                                    {userAns?.typed_answer || "(None)"}
                                  </strong>
                                </div>
                                {!userAns?.is_correct && (
                                  <div>
                                    <span style={{ color: "#64748b" }}>Correct Value:</span>{" "}
                                    <strong style={{ color: "#16a34a" }}>
                                      {q.correct_value}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="admin-empty">Full question details are not available for this quiz.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "recommendations" && (
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-title">AI Study Guide</div>
                  <div className="admin-card-subtitle">Recommended learning content based on your quiz performance.</div>
                </div>
              </div>
              <div style={{ padding: "1.5rem" }}>
                {attempts.length === 0 ? (
                  <div className="admin-empty">
                    Complete at least one quiz to generate personalized recommendations!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ padding: "1.25rem", border: "1px solid var(--admin-border)", borderRadius: "12px", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <strong style={{ fontSize: "1rem" }}>Mathematics: Algebra Fundamentals</strong>
                        <span className="status-pill status-active" style={{ fontSize: "11px" }}>High Priority</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 1rem 0" }}>
                        Based on your attempt on "Algebra Basics", we recommend reviewing polynomial expressions.
                      </p>
                      <button className="admin-secondary-btn" style={{ width: "auto", fontSize: "12px", padding: "6px 12px" }}>
                        Start Lesson
                      </button>
                    </div>

                    <div style={{ padding: "1.25rem", border: "1px solid var(--admin-border)", borderRadius: "12px", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <strong style={{ fontSize: "1rem" }}>Science: Chemical Bonds</strong>
                        <span className="status-pill status-active" style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#d97706" }}>Medium Priority</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 1rem 0" }}>
                        Review ionic and covalent bonding concepts to improve your Chemistry Term Test scores.
                      </p>
                      <button className="admin-secondary-btn" style={{ width: "auto", fontSize: "12px", padding: "6px 12px" }}>
                        Start Lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
