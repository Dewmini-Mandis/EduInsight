import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map, BookOpen, Target, Trophy, Clock, CheckCircle, ChevronRight, Lock, Calendar, ChevronDown, Check, AlertTriangle } from "lucide-react";

import { getToken, getUser } from "../../auth/authUtils";
import StudentSidebar from "../../components/StudentSidebar";
import "../../styles/admin.css";
import "../../styles/teacher.css";

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
  const [collapsed, setCollapsed] = useState(false);

  // Tabs: "learning-path" | "progress" (My Progress & History) | "quizzes" (Assigned Quizzes) | "recommendations"
  const [activeSection, setActiveSection] = useState<"learning-path" | "progress" | "quizzes" | "recommendations">(
    "learning-path"
  );
  // quizAction: "list" | "attempt" | "result" | "history_detail"
  const [quizAction, setQuizAction] = useState<"list" | "attempt" | "result" | "history_detail">("list");
  const [learningPathStep, setLearningPathStep] = useState<"term" | "lesson" | "level">("term");

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<number, { selected_answer?: number; typed_answer?: string }>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  // Quiz Session State
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
  const [expiresAtTime, setExpiresAtTime] = useState<number | null>(null);
  const [snapshotQuestions, setSnapshotQuestions] = useState<any[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

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
      const headers = { Authorization: `Token ${token}` };

      const [quizResult, attemptResult, lessonsResult, materialsResult] = await Promise.allSettled([
        fetch("/api/quizzes/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/quizzes/lessons/", { headers }),
        fetch("/api/quizzes/materials/", { headers }),
      ]);

      if (quizResult.status === "fulfilled" && quizResult.value.ok) {
        const quizData = await quizResult.value.json();
        setQuizzes(Array.isArray(quizData) ? quizData : quizData.results || []);
      }

      if (attemptResult.status === "fulfilled" && attemptResult.value.ok) {
        const attemptData = await attemptResult.value.json();
        setAttempts(Array.isArray(attemptData) ? attemptData : attemptData.results || []);
      }

      let lessonsArray: any[] = [];
      if (lessonsResult.status === "fulfilled" && lessonsResult.value.ok) {
        const lessonsData = await lessonsResult.value.json();
        lessonsArray = Array.isArray(lessonsData) ? lessonsData : lessonsData.results || [];
        setLessons(lessonsArray);
      }

      if (materialsResult.status === "fulfilled" && materialsResult.value.ok) {
        const materialsData = await materialsResult.value.json();
        setMaterials(Array.isArray(materialsData) ? materialsData : materialsData.results || []);
      }

      if (lessonsArray.length > 0) {
        // Find default lesson for current term or first available
        const defaultL = lessonsArray.find((l: any) => l.term_name === "Term 1") || lessonsArray[0];
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

  // Authoritative Expiration Timer Effect
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (quizAction === "attempt" && expiresAtTime !== null) {
      timerId = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAtTime - now) / 1000));
        setTimeElapsed(diff);
        if (diff <= 0) {
          clearInterval(timerId);
          // Auto submit on time expiration
          handleSubmitAttempt();
        }
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [quizAction, expiresAtTime, activeAttemptId]);

  // Compute stats for metrics
  const stats = useMemo(() => {
    const completedQuizIds = new Set(attempts.map((att) => att.quiz));
    const averageScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, att) => sum + (att.score || 0), 0) / attempts.length)
        : 0;

    // Find failed quizzes (best score < 75)
    const quizBestScores: Record<number, number> = {};
    attempts.forEach(att => {
      quizBestScores[att.quiz] = Math.max(quizBestScores[att.quiz] || 0, att.score);
    });

    const failedLessonIds = new Set<number>();
    Object.entries(quizBestScores).forEach(([quizId, bestScore]) => {
      if (bestScore < 75) {
        const quiz = quizzes.find(q => q.id === Number(quizId));
        if (quiz) failedLessonIds.add(quiz.lesson);
      }
    });

    // Recommend materials matching failed lessons
    const recommendedMaterials = materials.filter(m => failedLessonIds.has(m.lesson));

    return {
      completedCount: completedQuizIds.size,
      avgScore: averageScore,
      recommendationsCount: recommendedMaterials.length,
      recommendedMaterials,
    };
  }, [attempts, quizzes, materials]);

  // Derived state for the selected lesson learning path:
  const learningPathData = useMemo(() => {
    const termLessons = lessons.filter(l => l.term_name === selectedTerm);
    const activeLesson = lessons.find(l => l.id.toString() === selectedLessonId);
    
    // Quizzes assigned to the active lesson
    const lessonQuizzes = quizzes.filter(q => q.lesson === Number(selectedLessonId))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Completion helpers
    const isQuizCompleted = (quizId: number) => {
      const quiz = quizzes.find(q => q.id === quizId);
      return attempts.some(att => att.quiz === quizId && att.score >= (quiz?.pass_mark || 75));
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
      lessonQuizzes,
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

  const handleStartAttempt = async (quiz: any) => {
    setError("");
    setSuccessMessage("");
    setActionLoading(true);

    try {
      const token = getToken();
      const res = await fetch("/api/attempts/attempts/start/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ quiz: quiz.id }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(resData?.detail || "Unable to start quiz attempt.");
        if (resData?.detail && resData.detail.includes("maximum limit")) {
          handleViewAnswers(quiz);
        }
        setActionLoading(false);
        return;
      }

      const attemptObj = resData;
      setActiveAttemptId(attemptObj.id);
      setSelectedQuiz(quiz);

      // Snapshot questions locking order
      if (attemptObj.attempt_questions && attemptObj.attempt_questions.length > 0) {
        const snapshot = attemptObj.attempt_questions
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((aq: any) => aq.question_detail)
          .filter(Boolean);
        setSnapshotQuestions(snapshot);
      } else {
        setSnapshotQuestions(quiz.questions || []);
      }

      // Restored answers from active attempt
      const restoredAnswers: Record<number, { selected_answer?: number; typed_answer?: string }> = {};
      if (attemptObj.answers) {
        attemptObj.answers.forEach((ans: any) => {
          restoredAnswers[ans.question] = {
            selected_answer: ans.selected_answer,
            typed_answer: ans.typed_answer,
          };
        });
      }
      setAttemptAnswers(restoredAnswers);

      const startMs = attemptObj.start_time ? new Date(attemptObj.start_time).getTime() : Date.now();
      const expiryMs = attemptObj.expires_at ? new Date(attemptObj.expires_at).getTime() : startMs + (quiz.estimated_time_minutes || 10) * 60000;
      setQuizStartTime(startMs);
      setExpiresAtTime(expiryMs);

      setQuizAction("attempt");
      setActiveSection("quizzes");
    } catch (err: any) {
      setError(err.message || "Failed to start quiz attempt.");
    } finally {
      setActionLoading(false);
    }
  };

  const saveProgressiveAnswers = async (currentAttemptId: number | null, answersMap: any, hintsMap: any) => {
    if (!currentAttemptId) return;
    try {
      const token = getToken();
      const payload = {
        answers: Object.entries(answersMap).map(([qId, val]: [string, any]) => ({
          question: Number(qId),
          selected_answer: val?.selected_answer || null,
          typed_answer: val?.typed_answer || "",
          hint_count: hintsMap[Number(qId)] || 0,
        })),
      };

      const res = await fetch(`/api/attempts/attempts/${currentAttemptId}/save_answers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.expired && data.attempt) {
          setSelectedAttempt(data.attempt);
          setSuccessMessage("Time limit expired. Quiz auto-submitted.");
          setQuizAction("result");
        }
      }
    } catch (e) {
      console.error("Progressive save failed:", e);
    }
  };

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setAttemptAnswers((prev) => {
      const updated = {
        ...prev,
        [questionId]: { ...prev[questionId], selected_answer: answerId },
      };
      if (activeAttemptId) saveProgressiveAnswers(activeAttemptId, updated, hintsUsed);
      return updated;
    });
  };

  const handleTypedAnswerChange = (questionId: number, val: string) => {
    setAttemptAnswers((prev) => {
      const updated = {
        ...prev,
        [questionId]: { ...prev[questionId], typed_answer: val },
      };
      if (activeAttemptId) saveProgressiveAnswers(activeAttemptId, updated, hintsUsed);
      return updated;
    });
  };

  const handleSubmitAttempt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedQuiz || !activeAttemptId) return;
    setError("");
    setActionLoading(true);

    try {
      const token = getToken();
      const questionsToUse = snapshotQuestions.length > 0 ? snapshotQuestions : (selectedQuiz.questions || []);
      const payload = {
        answers: questionsToUse.map((q: any) => ({
          question: q.id,
          selected_answer: attemptAnswers[q.id]?.selected_answer || null,
          typed_answer: attemptAnswers[q.id]?.typed_answer || "",
          hint_count: hintsUsed[q.id] || 0,
        })),
      };

      const res = await fetch(`/api/attempts/attempts/${activeAttemptId}/submit/`, {
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
      setSuccessMessage(resultData.auto_submitted ? "Time limit expired. Quiz auto-submitted!" : "Quiz submitted successfully!");

      if (resultData.has_failed_all_attempts && resultData.redirect_to_material_id) {
        setSuccessMessage("You have completed all allowed attempts for this quiz. Redirecting you to the related Learning Material...");
        setTimeout(() => {
          navigate(`/student/materials/${resultData.redirect_to_material_id}/preview`);
        }, 1500);
      }

      setQuizAction("result");
      
      const attemptRes = await fetch("/api/attempts/attempts/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (attemptRes.ok) {
        const attemptData = await attemptRes.json();
        setAttempts(Array.isArray(attemptData) ? attemptData : attemptData.results || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit attempt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAnswers = (quiz: any) => {
    const quizAttempts = attempts.filter((a) => a.quiz === quiz.id);
    const lastAttempt = quizAttempts[0];
    if (lastAttempt) {
      setSelectedAttempt(lastAttempt);
      setSelectedQuiz(quiz);
      setQuizAction("result");
      // Keep them in their current active section
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
    <div className={`teacher-app-container ${collapsed ? "teacher-sidebar-collapsed" : ""}`}>
      <StudentSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        setQuizAction={setQuizAction}
        setLearningPathStep={setLearningPathStep}
        setSelectedAttempt={setSelectedAttempt}
        setSelectedQuiz={setSelectedQuiz}
        initials={initials}
        displayName={displayName}
        currentUser={currentUser}
      />

      <main className="teacher-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: collapsed ? "80px" : "280px", transition: "margin-left 0.3s ease", padding: "32px", backgroundColor: "var(--background)", boxSizing: "border-box", overflowY: "auto" }}>
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
            <>
              {learningPathStep === "term" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--navy-900)" }}>
                    <div style={{ background: "#e0e7ff", padding: "12px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Map size={24} color="#4338ca" />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Academic Learning Path</h2>
                      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>Follow your structured curriculum, unlock quiz levels, and master academic terms.</p>
                    </div>
                  </div>

                  <div style={{ background: "white", padding: "24px 28px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ background: "#EAF3FF", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#126BFF" }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--navy-900)" }}>Select an Academic Term</h3>
                        <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "14px", fontWeight: "400" }}>Choose a term to explore lessons and continue your learning journey.</p>
                      </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "12px" }}>
                      {[
                        { title: "Term 1", subtitle: "Start Learning" },
                        { title: "Term 2", subtitle: "Continue Your Journey" },
                        { title: "Term 3", subtitle: "Advanced Learning" }
                      ].map((t) => {
                        const isActive = selectedTerm === t.title;
                        return (
                          <button
                            key={t.title}
                            type="button"
                            onClick={() => {
                              setSelectedTerm(t.title);
                              setLearningPathStep("lesson");
                              setSelectedLessonId("");
                            }}
                            style={{
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              minHeight: "120px",
                              padding: "16px 18px",
                              borderRadius: "14px",
                              background: isActive ? "#126BFF" : "white",
                              color: isActive ? "white" : "var(--navy-900)",
                              border: `1px solid ${isActive ? "#126BFF" : "#e2e8f0"}`,
                              boxShadow: isActive ? "0 8px 20px rgba(18, 107, 255, 0.2)" : "0 2px 4px rgba(0, 0, 0, 0.03)",
                              cursor: "pointer",
                              transition: "all 0.25s ease"
                            }}
                          >
                            {isActive && (
                              <div style={{ position: "absolute", top: "10px", right: "10px", background: "white", borderRadius: "50%", padding: "2px", display: "flex" }}>
                                <CheckCircle size={14} color="#126BFF" />
                              </div>
                            )}
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "10px",
                                background: isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(18, 107, 255, 0.08)",
                                color: isActive ? "white" : "#126BFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "8px"
                              }}
                            >
                              <Calendar size={20} />
                            </div>
                            <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "2px" }}>{t.title}</div>
                            <div style={{ fontSize: "14px", color: isActive ? "rgba(255,255,255,0.85)" : "#64748b" }}>{t.subtitle}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "0 16px" }}>
                      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "50%" }}>
                        <BookOpen size={24} color="#3b82f6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--navy-900)", fontSize: "15px" }}>Structured Curriculum</div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Step-by-step learning aligned to syllabus</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "0 16px", borderLeft: "1px solid #e2e8f0" }}>
                      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "50%" }}>
                        <Target size={24} color="#3b82f6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--navy-900)", fontSize: "15px" }}>Master Concepts</div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Practice with quizzes and strengthen understanding</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "0 16px", borderLeft: "1px solid #e2e8f0" }}>
                      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "50%" }}>
                        <Trophy size={24} color="#3b82f6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--navy-900)", fontSize: "15px" }}>Track Progress</div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Monitor your growth and achieve your goals</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {learningPathStep === "lesson" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ cursor: "pointer" }} onClick={() => setLearningPathStep("term")}>Home</span>
                    <ChevronRight size={14} />
                    <span style={{ cursor: "pointer" }} onClick={() => setLearningPathStep("term")}>Learning Path</span>
                    <ChevronRight size={14} />
                    <span style={{ fontWeight: "600", color: "#3b82f6" }}>{selectedTerm}</span>
                    <ChevronRight size={14} />
                    <span style={{ fontWeight: "600", color: "var(--navy-900)" }}>Lessons</span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--navy-900)" }}>
                    <div style={{ background: "#e0e7ff", padding: "12px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={24} color="#4338ca" />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Academic Learning Path</h2>
                      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>Follow your structured curriculum, unlock quiz levels, and master academic terms.</p>
                    </div>
                  </div>

                  <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700", color: "var(--navy-900)" }}>Academic Lessons for {selectedTerm}</h3>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Explore your lessons, track progress, and strengthen your understanding.</p>
                      </div>
                      <button 
                        onClick={() => setLearningPathStep("term")}
                        style={{ background: "white", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: "8px", color: "var(--navy-900)", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
                      >
                        &larr; Back to Terms
                      </button>
                    </div>
                    
                    {learningPathData.termLessons.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px", fontStyle: "italic" }}>
                        No lessons created for {selectedTerm} yet.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                        {learningPathData.termLessons.map((lesson, idx) => {
                          const status = learningPathData.getLessonStatus(lesson.id);
                          const lessonQuizzes = quizzes.filter(q => q.lesson === lesson.id);
                          const totalQuizzes = lessonQuizzes.length;
                          const completedQuizzes = lessonQuizzes.filter(q => attempts.some(att => att.quiz === q.id && att.score >= 75)).length;
                          const progress = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;
                          
                          let badgeBg = "#f1f5f9", badgeColor = "#64748b", iconBg = "#f1f5f9", iconColor = "#64748b", progColor = "#cbd5e1";
                          if (status === "In Progress") { badgeBg = "#e0e7ff"; badgeColor = "#3b82f6"; iconBg = "#eff6ff"; iconColor = "#3b82f6"; progColor = "#3b82f6"; }
                          if (status === "Completed") { badgeBg = "#dcfce7"; badgeColor = "#16a34a"; iconBg = "#f0fdf4"; iconColor = "#16a34a"; progColor = "#16a34a"; }

                          return (
                            <div key={lesson.id} style={{ padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: "20px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                  <div style={{ background: iconBg, padding: "12px", borderRadius: "50%", display: "flex" }}>
                                    <BookOpen size={20} color={iconColor} />
                                  </div>
                                  <div style={{ fontWeight: "700", fontSize: "18px", color: "var(--navy-900)" }}>{lesson.title}</div>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", background: badgeBg, color: badgeColor }}>
                                  {status}
                                </span>
                              </div>

                              <div>
                                <div style={{ width: "100%", background: "#f1f5f9", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                                  <div style={{ width: `${progress}%`, background: progColor, height: "100%", transition: "width 0.5s ease" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                                  <span />
                                  <span>{progress}% Complete {status === "Completed" && <CheckCircle size={12} color="#16a34a" style={{ display: "inline", verticalAlign: "middle", marginLeft: "2px", marginBottom: "2px" }} />}</span>
                                </div>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #e2e8f0", paddingTop: "16px" }}>
                                <div style={{ display: "flex", gap: "16px", color: "#64748b", fontSize: "13px", fontWeight: "500" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Target size={16} /> {totalQuizzes} Quizzes</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Clock size={16} /> ~{totalQuizzes * 15}m</div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedLessonId(lesson.id.toString());
                                    setLearningPathStep("level");
                                  }}
                                  style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", cursor: "pointer", transition: "all 0.2s" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "transparent"; }}
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {learningPathStep === "level" && learningPathData.activeLesson && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ cursor: "pointer" }} onClick={() => setLearningPathStep("term")}>Home</span>
                    <ChevronRight size={14} />
                    <span style={{ cursor: "pointer" }} onClick={() => setLearningPathStep("term")}>Learning Path</span>
                    <ChevronRight size={14} />
                    <span style={{ fontWeight: "600", color: "#3b82f6", cursor: "pointer" }} onClick={() => setLearningPathStep("lesson")}>{selectedTerm}</span>
                    <ChevronRight size={14} />
                    <span style={{ fontWeight: "600", color: "var(--navy-900)" }}>{learningPathData.activeLesson.title}</span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--navy-900)" }}>
                    <div style={{ background: "#e0e7ff", padding: "16px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Map size={32} color="#4338ca" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>{learningPathData.activeLesson.title}</h2>
                      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "15px" }}>{learningPathData.activeLesson.description || "Master the fundamentals of this topic."}</p>
                    </div>
                    <button 
                      onClick={() => setLearningPathStep("lesson")}
                      style={{ background: "white", border: "1px solid #e2e8f0", padding: "10px 20px", borderRadius: "8px", color: "var(--navy-900)", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
                    >
                      &larr; Back to Lessons
                    </button>
                  </div>

                  <div style={{ background: "white", padding: "24px 32px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--navy-900)" }}>Lesson Progress</span>
                      <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--navy-900)" }}>
                        {learningPathData.overallProgress}%
                      </span>
                    </div>
                    <div style={{ width: "100%", background: "#f1f5f9", height: "12px", borderRadius: "6px", overflow: "hidden", marginBottom: "12px" }}>
                      <div style={{ width: `${learningPathData.overallProgress}%`, background: "#3b82f6", height: "100%", transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
                      <span><CheckCircle size={14} color="#3b82f6" style={{ display: "inline", verticalAlign: "middle", marginRight: "6px", marginBottom: "2px" }} /> {learningPathData.completedQuizzes} / {learningPathData.totalQuizzes} Quizzes Completed</span>
                      <span>Keep going! You're making great progress.</span>
                    </div>
                  </div>

                  <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <h3 style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: "700", color: "var(--navy-900)" }}>Quizzes</h3>
                    
                    {learningPathData.lessonQuizzes.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px", fontStyle: "italic" }}>
                        No quizzes available for this lesson yet.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                        {learningPathData.lessonQuizzes.map((quiz, index) => {
                          const attemptsCount = attempts.filter((att) => att.quiz === quiz.id).length;
                          const maxAttempts = quiz.max_attempts || 3;
                          const isLimitReached = attemptsCount >= maxAttempts;
                          const isCompleted = learningPathData.isQuizCompleted(quiz.id);
                          const isLocked = index > 0 && !learningPathData.isQuizCompleted(learningPathData.lessonQuizzes[index - 1].id);
                          return (
                            <div 
                              key={quiz.id} 
                              onClick={() => {
                                if (!isLocked) {
                                  if (isLimitReached) {
                                    handleViewAnswers(quiz);
                                  } else {
                                    handleStartAttempt(quiz);
                                  }
                                }
                              }} 
                              style={{
                                padding: "16px",
                                border: `1px solid ${isCompleted ? "#dcfce7" : isLimitReached ? "#fee2e2" : isLocked ? "#f1f5f9" : "#e2e8f0"}`,
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: isLocked ? "not-allowed" : "pointer",
                                background: isLocked ? "#f8fafc" : isLimitReached ? "#fff5f5" : "white",
                                transition: "all 0.2s",
                                opacity: isLocked ? 0.6 : 1
                              }} 
                              onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.borderColor = isLimitReached ? "#ef4444" : "#3b82f6"; }} 
                              onMouseLeave={(e) => { if (!isLocked) e.currentTarget.style.borderColor = isCompleted ? "#dcfce7" : isLimitReached ? "#fee2e2" : "#e2e8f0"; }}
                            >
                              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div style={{ background: isCompleted ? "#22c55e" : isLimitReached ? "#ef4444" : isLocked ? "#cbd5e1" : "#f1f5f9", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {isCompleted ? <Check size={20} color="white" /> : isLimitReached ? <AlertTriangle size={20} color="white" /> : isLocked ? <Lock size={20} color="white" /> : <Map size={20} color="#3b82f6" />}
                                </div>
                                <div>
                                  <div style={{ fontSize: "14px", fontWeight: "700", color: isLocked ? "#94a3b8" : "var(--navy-900)", marginBottom: "4px" }}>{quiz.title}</div>
                                  <div style={{ fontSize: "12px", color: isCompleted ? "#16a34a" : isLimitReached ? "#dc2626" : isLocked ? "#94a3b8" : "#64748b", fontWeight: "600" }}>
                                    Quiz {quiz.order || index + 1} &bull; {isCompleted ? "Completed" : isLimitReached ? "Attempts Exhausted" : isLocked ? "Locked" : "In Progress"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: isLimitReached ? "#b91c1c" : "#64748b", marginTop: "2px", fontWeight: "600" }}>
                                    Attempts: {attemptsCount} / {maxAttempts}
                                  </div>
                                </div>
                              </div>
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1px solid ${isCompleted ? "#16a34a" : isLimitReached ? "#ef4444" : isLocked ? "transparent" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", background: isCompleted ? "#dcfce7" : isLimitReached ? "#fee2e2" : "transparent" }}>
                                {isCompleted ? <Check size={14} color="#16a34a" /> : isLimitReached ? <AlertTriangle size={14} color="#dc2626" /> : isLocked ? <Lock size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#3b82f6" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", background: "#f8fafc", padding: "12px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={16} />
                      Time Elapsed
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--navy-900)" }}>
                      {Math.floor(timeElapsed / 60).toString().padStart(2, "0")}:{(timeElapsed % 60).toString().padStart(2, "0")}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {(snapshotQuestions.length > 0 ? snapshotQuestions : (selectedQuiz.questions || []))?.map((q: any, qIdx: number) => (
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
                                    const updatedHints = { ...hintsUsed, [q.id]: currentCount + 1 };
                                    setHintsUsed(updatedHints);
                                     if (activeAttemptId) saveProgressiveAnswers(activeAttemptId, attemptAnswers, updatedHints);
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
                    <div style={{ padding: "4px 12px", background: "#3b82f6", color: "white", borderRadius: "12px", fontSize: "14px", fontWeight: "700", display: "inline-block", marginBottom: "0.5rem" }}>
                      Current Level: {Math.floor(quizzes.filter(q => attempts.some(a => a.quiz === q.id && a.score >= (q.pass_mark || 75))).length / 2) + 1}
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
                      Attempt #{selectedAttempt.attempt_number} ({selectedAttempt.attempt_number === 1 ? "Main Quiz" : selectedAttempt.attempt_number === 2 ? "Reassessment 1" : "Reassessment 2"}) &bull; Completed
                    </div>
                  </div>

                  {/* Immediate ML Risk Prediction Card */}
                  {selectedAttempt?.risk_prediction && (
                    <div style={{
                      background: selectedAttempt.risk_prediction.risk_level === "High Risk" ? "#fef2f2" : "#f0fdf4",
                      border: `1px solid ${selectedAttempt.risk_prediction.risk_level === "High Risk" ? "#fecaca" : "#bbf7d0"}`,
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: selectedAttempt.risk_prediction.risk_level === "High Risk" ? "#991b1b" : "#166534" }}>
                          Immediate ML Risk Assessment: {selectedAttempt.risk_prediction.risk_level}
                        </div>
                        <div style={{ fontSize: "12px", color: selectedAttempt.risk_prediction.risk_level === "High Risk" ? "#7f1d1d" : "#14532d", marginTop: "4px" }}>
                          Model Confidence Probability: {selectedAttempt.risk_prediction.high_risk_probability != null ? (selectedAttempt.risk_prediction.high_risk_probability * 100).toFixed(1) + "%" : "Evaluated"}
                        </div>
                      </div>
                      <span style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontWeight: "700",
                        fontSize: "12px",
                        backgroundColor: selectedAttempt.risk_prediction.risk_level === "High Risk" ? "#ef4444" : "#22c55e",
                        color: "white"
                      }}>
                        {selectedAttempt.risk_prediction.risk_level}
                      </span>
                    </div>
                  )}

                  {/* Remediation Assignment Notice */}
                  {selectedAttempt.score < (selectedQuiz?.pass_mark || 75) && (
                    <div style={{
                      background: "#fffbebf5",
                      border: "1px solid #fde68a",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "1.5rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#92400e", fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>
                        <AlertTriangle size={18} color="#d97706" />
                        Remedial Learning Assigned
                      </div>
                      <div style={{ fontSize: "13px", color: "#78350f", marginBottom: selectedAttempt.redirect_to_material_id ? "12px" : "0px" }}>
                        Your score ({selectedAttempt.score}%) is below the required pass mark ({selectedQuiz?.pass_mark || 75}%). Required learning materials have been assigned to your profile. Please complete them before attempting reassessments.
                      </div>
                      {selectedAttempt.redirect_to_material_id && (
                        <button
                          className="admin-primary-btn"
                          style={{ backgroundColor: "#126BFF", padding: "8px 16px", fontSize: "13px", width: "auto" }}
                          onClick={() => navigate(`/student/materials/${selectedAttempt.redirect_to_material_id}/preview`)}
                        >
                          View Related Learning Material
                        </button>
                      )}
                    </div>
                  )}

                  {(() => {
                    const currentAttemptsCount = attempts.filter((att) => att.quiz === selectedQuiz?.id).length;
                    const currentMaxAttempts = selectedQuiz?.max_attempts || 3;
                    const currentIsLimitReached = currentAttemptsCount >= currentMaxAttempts;

                    if (!currentIsLimitReached) {
                      return (
                        <div style={{ padding: "20px", background: "#fef3c7", color: "#b45309", borderRadius: "12px", border: "1px solid #fde68a", textAlign: "center", marginBottom: "2rem" }}>
                          <span style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>Answers Hidden</span>
                          You have {currentMaxAttempts - currentAttemptsCount} attempt(s) remaining. The correct answers will be revealed once you have exhausted all your attempts.
                        </div>
                      );
                    }

                    return (
                      <>
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
                      </>
                    );
                  })()}

                  <div style={{ marginTop: "2rem" }}>
                    {(() => {
                      const currentAttemptsCount = attempts.filter((att) => att.quiz === selectedQuiz?.id).length;
                      const currentMaxAttempts = selectedQuiz?.max_attempts || 3;
                      const currentIsLimitReached = currentAttemptsCount >= currentMaxAttempts;
                      
                      if (currentIsLimitReached) {
                        return (
                          <button
                            className="admin-primary-btn"
                            style={{ backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" }}
                            onClick={() => {
                              setQuizAction("list");
                              setActiveSection("learning-path");
                              setLearningPathStep("lesson");
                              setSelectedLessonId(selectedQuiz?.lesson?.toString() || selectedLessonId);
                              setSelectedQuiz(null);
                              setSelectedAttempt(null);
                            }}
                          >
                            Study Lesson Materials
                          </button>
                        );
                      }

                      return selectedAttempt.score >= (selectedQuiz?.pass_mark || 75) ? (
                        <button
                          className="admin-primary-btn"
                          onClick={() => {
                            setQuizAction("list");
                            setActiveSection("learning-path");
                            setLearningPathStep("lesson");
                            setSelectedQuiz(null);
                            setSelectedAttempt(null);
                            setError("");
                            setSuccessMessage("");
                          }}
                        >
                          Proceed to Study Lessons
                        </button>
                      ) : (
                        <button
                          className="admin-primary-btn"
                          style={{ backgroundColor: "#f59e0b", borderColor: "#f59e0b" }}
                          onClick={() => {
                            setQuizAction("list");
                            setActiveSection("learning-path");
                            setSelectedQuiz(null);
                            setSelectedAttempt(null);
                            setError("");
                            setSuccessMessage("");
                          }}
                        >
                          Return to Quizzes (Try Again)
                        </button>
                      );
                    })()}
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
                {stats.recommendedMaterials.length === 0 ? (
                  <div className="admin-empty">
                    Great job! You have no pending recommendations right now.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {stats.recommendedMaterials.map((material: any) => (
                      <div key={material.id} style={{ padding: "1.25rem", border: "1px solid var(--admin-border)", borderRadius: "12px", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <strong style={{ fontSize: "1rem" }}>{material.title}</strong>
                          <span className="status-pill status-active" style={{ fontSize: "11px", backgroundColor: "#fef3c7", color: "#d97706" }}>Remedial Material</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 1rem 0" }}>
                          {material.material_type === "TEXT" ? "Theory & Summary" : material.material_type === "VIDEO" ? "Video Lesson" : "Document"}
                        </p>
                        {material.material_type === "TEXT" ? (
                          <div style={{ fontSize: "13px", color: "#334155", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            {material.content}
                          </div>
                        ) : (
                          <button onClick={() => navigate(`/student/lessons/${material.lesson}`)} className="admin-secondary-btn" style={{ width: "auto", fontSize: "12px", padding: "6px 12px" }}>
                            Open Lesson
                          </button>
                        )}
                      </div>
                    ))}
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
