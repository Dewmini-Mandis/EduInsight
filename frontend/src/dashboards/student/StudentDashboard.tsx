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

// Custom SVG Bar Chart for Quiz Scores
const BarChart = ({ data }: { data: { name: string; score: number | null }[] }) => {
  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: "rgba(255, 255, 255, 0.7)", borderRadius: "12px", border: "1px solid rgba(226, 232, 240, 0.8)", backdropFilter: "blur(8px)" }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = paddingTop + chartHeight - (val / 100) * chartHeight;
        return (
          <g key={val}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={paddingLeft - 10} y={y + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: "600" }}>{val}%</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((item, idx) => {
        const barWidth = Math.min(40, chartWidth / Math.max(1, data.length) - 20);
        const colWidth = chartWidth / Math.max(1, data.length);
        const x = paddingLeft + idx * colWidth + (colWidth - barWidth) / 2;
        const score = item.score || 0;
        const barHeight = (score / 100) * chartHeight;
        const y = paddingTop + chartHeight - barHeight;

        return (
          <g key={idx}>
            {/* Background bar */}
            <rect x={x} y={paddingTop} width={barWidth} height={chartHeight} fill="#f8fafc" rx="4" />
            {/* Colored bar */}
            {item.score !== null && (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={score >= 75 ? "url(#grad-green)" : score >= 50 ? "url(#grad-blue)" : "url(#grad-red)"}
                rx="4"
                style={{ transition: "all 0.3s ease" }}
              />
            )}
            {/* Tooltip / Value on top */}
            {item.score !== null && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" style={{ fontSize: "10px", fill: score >= 75 ? "#047857" : score >= 50 ? "#1d4ed8" : "#b91c1c", fontWeight: "700" }}>
                {score}%
              </text>
            )}
            {/* Label */}
            <text
              x={x + barWidth / 2}
              y={height - paddingBottom + 18}
              textAnchor="middle"
              style={{ fontSize: "10px", fill: "#64748b", fontWeight: "600" }}
            >
              {item.name.length > 12 ? item.name.slice(0, 10) + ".." : item.name}
            </text>
          </g>
        );
      })}

      {/* Gradients */}
      <defs>
        <linearGradient id="grad-blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="grad-green" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="grad-red" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.95" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Custom SVG Line Chart for Performance Trend
const LineChart = ({ attemptsList }: { attemptsList: any[] }) => {
  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Take the last 8 attempts chronologically
  const data = [...attemptsList]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(-8);

  const points = data.map((item, idx) => {
    const colWidth = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
    const x = data.length > 1 ? paddingLeft + idx * colWidth : paddingLeft + chartWidth / 2;
    const y = paddingTop + chartHeight - ((item.score || 0) / 100) * chartHeight;
    return { x, y, score: item.score };
  });

  const pathD = points.length > 0
    ? points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: "rgba(255, 255, 255, 0.7)", borderRadius: "12px", border: "1px solid rgba(226, 232, 240, 0.8)", backdropFilter: "blur(8px)" }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = paddingTop + chartHeight - (val / 100) * chartHeight;
        return (
          <g key={val}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={paddingLeft - 10} y={y + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: "600" }}>{val}%</text>
          </g>
        );
      })}

      {points.length === 0 && (
        <text x={width / 2} y={height / 2} textAnchor="middle" style={{ fill: "#94a3b8", fontSize: "11px", fontWeight: "600" }}>No attempts recorded yet</text>
      )}

      {points.length > 0 && (
        <>
          {/* Line */}
          <path d={pathD} fill="none" stroke="url(#line-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" style={{ fontSize: "9px", fill: "#1e3a8a", fontWeight: "700" }}>{p.score}%</text>
              <text x={p.x} y={height - paddingBottom + 18} textAnchor="middle" style={{ fontSize: "10px", fill: "#64748b", fontWeight: "600" }}>
                #{idx + 1}
              </text>
            </g>
          ))}
        </>
      )}

      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser() as CurrentUser | null;

  // Tabs: "learning-path" | "progress" (My Progress & History) | "quizzes" (Assigned Quizzes) | "recommendations"
  const [activeSection, setActiveSection] = useState<"learning-path" | "progress" | "quizzes" | "recommendations">(
    "learning-path"
  );
  // quizAction: "list" | "attempt" | "result" | "history_detail"
  const [quizAction, setQuizAction] = useState<"list" | "attempt" | "result" | "history_detail">("list");
  const [learningPathStep, setLearningPathStep] = useState<"term" | "lesson" | "level">("term");

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("1st Term");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
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

      // Fetch lessons
      const lessonsRes = await fetch("/api/quizzes/lessons/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!lessonsRes.ok) throw new Error("Unable to fetch lessons");
      const lessonsData = await lessonsRes.json();
      setLessons(lessonsData);
      
      if (lessonsData.length > 0) {
        // Find default lesson for current term or first available
        const defaultL = lessonsData.find((l: any) => l.term === "1st Term") || lessonsData[0];
        setSelectedLessonId(defaultL.id.toString());
      }
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

  // Derived state for the selected lesson learning path:
  const learningPathData = useMemo(() => {
    const termLessons = lessons.filter(l => l.term === selectedTerm);
    const activeLesson = lessons.find(l => l.id.toString() === selectedLessonId);
    
    // Quizzes assigned to the active lesson
    const lessonQuizzes = quizzes.filter(q => q.lesson === Number(selectedLessonId));
    
    const beginnerQuizzes = lessonQuizzes.filter(q => q.learning_level === "Beginner");
    const intermediateQuizzes = lessonQuizzes.filter(q => q.learning_level === "Intermediate");
    const advancedQuizzes = lessonQuizzes.filter(q => q.learning_level === "Advanced");

    // Completion helpers
    const isQuizCompleted = (quizId: number) => {
      return attempts.some(att => att.quiz === quizId && att.score >= 75);
    };

    const getBestScore = (quizId: number) => {
      const quizAttempts = attempts.filter(att => att.quiz === quizId);
      if (quizAttempts.length === 0) return null;
      return Math.max(...quizAttempts.map(att => att.score || 0));
    };

    const getLessonStatus = (lessonId: number) => {
      const lQuizzes = quizzes.filter(q => q.lesson === lessonId);
      if (lQuizzes.length === 0) return "Pending";
      const completedCount = lQuizzes.filter(q => attempts.some(att => att.quiz === q.id && att.score >= 75)).length;
      if (completedCount === 0) return "Pending";
      if (completedCount === lQuizzes.length) return "Completed";
      return "In Progress";
    };

    // Unlocking state
    const beginnerCompleted = beginnerQuizzes.length > 0 && beginnerQuizzes.every(q => isQuizCompleted(q.id));
    const intermediateUnlocked = beginnerCompleted;
    const intermediateCompleted = intermediateUnlocked && intermediateQuizzes.length > 0 && intermediateQuizzes.every(q => isQuizCompleted(q.id));
    const advancedUnlocked = intermediateCompleted;
    const advancedCompleted = advancedUnlocked && advancedQuizzes.length > 0 && advancedQuizzes.every(q => isQuizCompleted(q.id));

    // Current student level
    let currentLevel = "Beginner Level";
    if (intermediateUnlocked && !intermediateCompleted) {
      currentLevel = "Intermediate Level";
    } else if (advancedUnlocked) {
      currentLevel = "Advanced Level";
    }

    // Numbers
    const totalQuizzes = lessonQuizzes.length;
    const completedQuizzes = lessonQuizzes.filter(q => isQuizCompleted(q.id)).length;
    const remainingQuizzes = totalQuizzes - completedQuizzes;
    const overallProgress = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;

    // Charts data:
    // Bar chart data showing best scores for all quizzes in this lesson
    const barChartData = lessonQuizzes.map(q => ({
      name: q.title,
      score: getBestScore(q.id),
    }));

    // Line chart data: filter attempts to only those for quizzes in this lesson
    const lessonQuizIds = new Set(lessonQuizzes.map(q => q.id));
    const lessonAttempts = attempts.filter(att => lessonQuizIds.has(att.quiz));

    return {
      termLessons,
      activeLesson,
      beginnerQuizzes,
      intermediateQuizzes,
      advancedQuizzes,
      beginnerCompleted,
      intermediateUnlocked,
      intermediateCompleted,
      advancedUnlocked,
      advancedCompleted,
      currentLevel,
      totalQuizzes,
      completedQuizzes,
      remainingQuizzes,
      overallProgress,
      barChartData,
      lessonAttempts,
      isQuizCompleted,
      getBestScore,
      getLessonStatus,
    };
  }, [lessons, quizzes, attempts, selectedTerm, selectedLessonId]);

  const handleStartAttempt = (quiz: any) => {
    setSelectedQuiz(quiz);
    setAttemptAnswers({});
    setError("");
    setSuccessMessage("");
    setQuizAction("attempt");
    setActiveSection("quizzes");
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

      let isFinalAttempt = false;
      // refresh attempts
      const attemptRes = await fetch("/api/attempts/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (attemptRes.ok) {
        const attemptData = await attemptRes.json();
        setAttempts(attemptData);
        
        const count = attemptData.filter((a: any) => a.quiz === selectedQuiz.id).length;
        const maxAttempts = selectedQuiz.max_attempts || 3;
        if (count >= maxAttempts) {
          isFinalAttempt = true;
        }
      }

      if (isFinalAttempt) {
        setQuizAction("result");
      } else {
        setQuizAction("list");
        setActiveSection("learning-path");
        setSelectedQuiz(null);
        setSelectedAttempt(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit attempt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAnswers = (quiz: any) => {
    const quizAttempts = attempts.filter((a) => a.quiz === quiz.id);
    const bestAttempt = quizAttempts.reduce((prev, current) => (prev.score > current.score) ? prev : current, quizAttempts[0]);
    if (bestAttempt) {
      setSelectedAttempt(bestAttempt);
      setSelectedQuiz(quiz);
      setQuizAction("result");
      setActiveSection("quizzes");
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
              className={`admin-nav-item ${activeSection === "learning-path" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveSection("learning-path");
                setQuizAction("list");
                setLearningPathStep("term");
                setSelectedAttempt(null);
                setSelectedQuiz(null);
              }}
            >
              Learning Path
            </button>
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
              {activeSection === "learning-path"
                ? "Academic Learning Path"
                : activeSection === "progress"
                ? "Learning Progress"
                : activeSection === "quizzes"
                ? "Quiz Management"
                : "Personalized Recommendations"}
            </div>
            <div className="admin-subtitle">
              {activeSection === "learning-path"
                ? "Follow your structured curriculum, unlock quiz levels, and master academic terms."
                : activeSection === "progress"
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
          {activeSection === "learning-path" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {learningPathStep === "term" && (
                <div style={{ background: "white", padding: "40px 20px", borderRadius: "12px", border: "1px solid var(--admin-border)", textAlign: "center" }}>
                  <h2 style={{ marginBottom: "20px", color: "var(--admin-sidebar)" }}>Select Academic Term</h2>
                  <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                    {["1st Term", "2nd Term", "3rd Term"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTerm(t);
                          setLearningPathStep("lesson");
                          setSelectedLessonId("");
                        }}
                        style={{
                          padding: "16px 32px",
                          fontSize: "16px",
                          fontWeight: "700",
                          borderRadius: "12px",
                          background: selectedTerm === t ? "var(--admin-accent)" : "white",
                          color: selectedTerm === t ? "white" : "var(--admin-sidebar)",
                          border: `2px solid ${selectedTerm === t ? "var(--admin-accent)" : "var(--admin-border)"}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {learningPathStep === "lesson" && (
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--admin-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, color: "var(--admin-sidebar)" }}>Academic Lessons for {selectedTerm}</h2>
                    <button 
                      onClick={() => setLearningPathStep("term")}
                      className="admin-secondary-btn"
                      style={{ width: "auto", padding: "8px 16px" }}
                    >
                      &larr; Back to Terms
                    </button>
                  </div>
                  
                  {learningPathData.termLessons.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px", fontStyle: "italic" }}>
                      No lessons created for {selectedTerm} yet.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
                      {learningPathData.termLessons.map((lesson) => {
                        const status = learningPathData.getLessonStatus(lesson.id);
                        let badgeStyle = { backgroundColor: "#f1f5f9", color: "#64748b" }; // Pending
                        if (status === "In Progress") badgeStyle = { backgroundColor: "#fef3c7", color: "#d97706" };
                        if (status === "Completed") badgeStyle = { backgroundColor: "#ecfdf5", color: "#047857" };

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => {
                              setSelectedLessonId(lesson.id.toString());
                              setLearningPathStep("level");
                            }}
                            style={{
                              textAlign: "left",
                              padding: "20px",
                              borderRadius: "12px",
                              border: "2px solid var(--admin-border)",
                              background: "white",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--admin-accent)"}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--admin-border)"}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                              <div style={{ fontWeight: "800", fontSize: "16px", color: "var(--admin-sidebar)" }}>
                                {lesson.title}
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "20px", ...badgeStyle }}>
                                {status}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {learningPathStep === "level" && learningPathData.activeLesson && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, color: "var(--admin-sidebar)", fontSize: "1.5rem" }}>
                      {learningPathData.activeLesson.title} - {learningPathData.currentLevel}
                    </h2>
                    <button 
                      onClick={() => setLearningPathStep("lesson")}
                      className="admin-secondary-btn"
                      style={{ width: "auto", padding: "8px 16px" }}
                    >
                      &larr; Back to Lessons
                    </button>
                  </div>

                  {/* Overall Progress Bar */}
                  <div style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid var(--admin-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Overall Progress</span>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--admin-sidebar)" }}>
                        {learningPathData.overallProgress}%
                      </span>
                    </div>
                    <div style={{ width: "100%", background: "#f1f5f9", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${learningPathData.overallProgress}%`, background: "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)", height: "100%", transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", textAlign: "right" }}>
                      {learningPathData.completedQuizzes} / {learningPathData.totalQuizzes} Quizzes Completed
                    </div>
                  </div>

                  {/* Level Unlocking & Quiz Grid */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    {/* Beginner Level */}
                    <div style={{ display: "flex", flexDirection: "column", background: "white", border: "1px solid var(--admin-border)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <span style={{ fontWeight: "800", fontSize: "16px", color: "var(--admin-sidebar)" }}>Beginner Level</span>
                        {learningPathData.beginnerCompleted ? (
                          <span style={{ fontSize: "11px", color: "#047857", backgroundColor: "#ecfdf5", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Passed 🏆
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#d97706", backgroundColor: "#fef3c7", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            In Progress
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {learningPathData.beginnerQuizzes.map((quiz, index, arr) => {
                          const isCompleted = learningPathData.isQuizCompleted(quiz.id);
                          const score = learningPathData.getBestScore(quiz.id);
                          const isUnlocked = index === 0 || learningPathData.isQuizCompleted(arr[index - 1].id);
                          const attemptsCount = attempts.filter((att) => att.quiz === quiz.id).length;
                          const maxAttempts = quiz.max_attempts || 3;
                          const isLimitReached = attemptsCount >= maxAttempts;
                          const canAttempt = isUnlocked && !isLimitReached;
                          return (
                            <div key={quiz.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", opacity: isUnlocked ? 1 : 0.6 }}>
                              <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                  {quiz.title} {!isUnlocked && <span style={{ fontSize: "12px", marginLeft: "4px" }}>🔒</span>}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  {score !== null ? `Best Score: ${score}% (${attemptsCount}/${maxAttempts} attempts)` : isUnlocked ? `Not attempted yet (0/${maxAttempts} attempts)` : "Pending"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => isLimitReached ? handleViewAnswers(quiz) : handleStartAttempt(quiz)}
                                disabled={!isUnlocked}
                                style={{ 
                                  width: "auto", 
                                  padding: "6px 16px", 
                                  fontSize: "12px",
                                  opacity: isUnlocked ? 1 : 0.5,
                                  cursor: isUnlocked ? "pointer" : "not-allowed"
                                }}
                              >
                                {isLimitReached ? "View Answers" : isCompleted ? "Re-attempt" : isUnlocked ? "Start" : "Locked"}
                              </button>
                            </div>
                          );
                        })}
                        {learningPathData.beginnerQuizzes.length === 0 && (
                          <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "12px" }}>No beginner quizzes.</div>
                        )}
                      </div>
                    </div>

                    {/* Intermediate Level */}
                    <div style={{ display: "flex", flexDirection: "column", background: "white", border: "1px solid var(--admin-border)", borderRadius: "12px", padding: "16px", opacity: learningPathData.intermediateUnlocked ? 1 : 0.65 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "800", fontSize: "16px", color: "var(--admin-sidebar)" }}>Intermediate Level</span>
                          {!learningPathData.intermediateUnlocked && <span style={{ fontSize: "14px" }}>🔒</span>}
                        </div>
                        {learningPathData.intermediateCompleted ? (
                          <span style={{ fontSize: "11px", color: "#047857", backgroundColor: "#ecfdf5", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Passed 🏆
                          </span>
                        ) : learningPathData.intermediateUnlocked ? (
                          <span style={{ fontSize: "11px", color: "#d97706", backgroundColor: "#fef3c7", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Unlocked
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Locked
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {learningPathData.intermediateQuizzes.map((quiz, index, arr) => {
                          const isCompleted = learningPathData.isQuizCompleted(quiz.id);
                          const score = learningPathData.getBestScore(quiz.id);
                          const isUnlocked = learningPathData.intermediateUnlocked && (index === 0 || learningPathData.isQuizCompleted(arr[index - 1].id));
                          const attemptsCount = attempts.filter((att) => att.quiz === quiz.id).length;
                          const maxAttempts = quiz.max_attempts || 3;
                          const isLimitReached = attemptsCount >= maxAttempts;
                          const canAttempt = isUnlocked && !isLimitReached;
                          return (
                            <div key={quiz.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", opacity: isUnlocked ? 1 : 0.6 }}>
                              <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                  {quiz.title} {!isUnlocked && <span style={{ fontSize: "12px", marginLeft: "4px" }}>🔒</span>}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  {score !== null ? `Best Score: ${score}% (${attemptsCount}/${maxAttempts} attempts)` : isUnlocked ? `Not attempted yet (0/${maxAttempts} attempts)` : "Pending"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => isLimitReached ? handleViewAnswers(quiz) : handleStartAttempt(quiz)}
                                disabled={!isUnlocked}
                                style={{ 
                                  width: "auto", 
                                  padding: "6px 16px", 
                                  fontSize: "12px", 
                                  opacity: isUnlocked ? 1 : 0.5,
                                  cursor: isUnlocked ? "pointer" : "not-allowed"
                                }}
                              >
                                {isLimitReached ? "View Answers" : isCompleted ? "Re-attempt" : isUnlocked ? "Start" : "Locked"}
                              </button>
                            </div>
                          );
                        })}
                        {learningPathData.intermediateQuizzes.length === 0 && (
                          <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "12px" }}>No intermediate quizzes.</div>
                        )}
                      </div>
                    </div>

                    {/* Advanced Level */}
                    <div style={{ display: "flex", flexDirection: "column", background: "white", border: "1px solid var(--admin-border)", borderRadius: "12px", padding: "16px", opacity: learningPathData.advancedUnlocked ? 1 : 0.65 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "800", fontSize: "16px", color: "var(--admin-sidebar)" }}>Advanced Level</span>
                          {!learningPathData.advancedUnlocked && <span style={{ fontSize: "14px" }}>🔒</span>}
                        </div>
                        {learningPathData.advancedCompleted ? (
                          <span style={{ fontSize: "11px", color: "#047857", backgroundColor: "#ecfdf5", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Passed 🏆
                          </span>
                        ) : learningPathData.advancedUnlocked ? (
                          <span style={{ fontSize: "11px", color: "#d97706", backgroundColor: "#fef3c7", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Unlocked
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: "20px", fontWeight: "700" }}>
                            Locked
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {learningPathData.advancedQuizzes.map((quiz, index, arr) => {
                          const isCompleted = learningPathData.isQuizCompleted(quiz.id);
                          const score = learningPathData.getBestScore(quiz.id);
                          const isUnlocked = learningPathData.advancedUnlocked && (index === 0 || learningPathData.isQuizCompleted(arr[index - 1].id));
                          const attemptsCount = attempts.filter((att) => att.quiz === quiz.id).length;
                          const maxAttempts = quiz.max_attempts || 3;
                          const isLimitReached = attemptsCount >= maxAttempts;
                          const canAttempt = isUnlocked && !isLimitReached;
                          return (
                            <div key={quiz.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", opacity: isUnlocked ? 1 : 0.6 }}>
                              <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                                  {quiz.title} {!isUnlocked && <span style={{ fontSize: "12px", marginLeft: "4px" }}>🔒</span>}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  {score !== null ? `Best Score: ${score}% (${attemptsCount}/${maxAttempts} attempts)` : isUnlocked ? `Not attempted yet (0/${maxAttempts} attempts)` : "Pending"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => isLimitReached ? handleViewAnswers(quiz) : handleStartAttempt(quiz)}
                                disabled={!isUnlocked}
                                style={{ 
                                  width: "auto", 
                                  padding: "6px 16px", 
                                  fontSize: "12px", 
                                  opacity: isUnlocked ? 1 : 0.5,
                                  cursor: isUnlocked ? "pointer" : "not-allowed"
                                }}
                              >
                                {isLimitReached ? "View Answers" : isCompleted ? "Re-attempt" : isUnlocked ? "Start" : "Locked"}
                              </button>
                            </div>
                          );
                        })}
                        {learningPathData.advancedQuizzes.length === 0 && (
                          <div style={{ textAlign: "center", padding: "10px", color: "#94a3b8", fontSize: "12px" }}>No advanced quizzes.</div>
                        )}
                      </div>
                    </div>
                  </div>


                </div>
              )}
            </div>
          )}

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
                        <span className={`status-pill ${att.score >= 75 ? "status-active" : "status-suspended"}`}>
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
                            onClick={() => isLimitReached ? handleViewAnswers(quiz) : handleStartAttempt(quiz)}
                          >
                            {isLimitReached ? "View Answers" : "Start Quiz"}
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
                        color: selectedAttempt.score >= 75 ? "#15803d" : "#b91c1c",
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
                                        : "transparent",
                                      background: ans.is_correct
                                        ? "#f0fdf4"
                                        : "transparent",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        color: ans.is_correct ? "#16a34a" : "#cbd5e1",
                                      }}
                                    >
                                      {ans.is_correct ? "✓" : "○"}
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
                                <span style={{ color: "#64748b" }}>Correct Value:</span>{" "}
                                <strong style={{ color: "#16a34a" }}>
                                  {q.correct_value}
                                </strong>
                              </div>
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
                        setActiveSection("learning-path");
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
                                          : "transparent",
                                        background: ans.is_correct
                                          ? "#f0fdf4"
                                          : "transparent",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "bold",
                                          color: ans.is_correct ? "#16a34a" : "#cbd5e1",
                                        }}
                                      >
                                        {ans.is_correct ? "✓" : "○"}
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
                                  <span style={{ color: "#64748b" }}>Correct Value:</span>{" "}
                                  <strong style={{ color: "#16a34a" }}>
                                    {q.correct_value}
                                  </strong>
                                </div>
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
