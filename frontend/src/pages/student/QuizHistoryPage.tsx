import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, CheckCircle2, XCircle, ArrowLeft, Clock } from "lucide-react";
import ProgressHeader from "../../components/student/progress/ProgressHeader";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

interface QuizAttemptRaw {
  id: number;
  quiz: number;
  quiz_title?: string;
  lesson_title?: string;
  term_name?: string;
  attempt_type?: "ORDINARY" | "REASSESSMENT";
  attempt_number: number;
  status: string;
  score: number | null;
  start_time: string;
  end_time?: string;
}

interface QuizRaw {
  id: number;
  title: string;
  pass_mark: number;
  max_attempts?: number;
  lesson?: number;
  lesson_title?: string;
  term_name?: string;
}

interface QuizGroupedRecord {
  quizId: number;
  title: string;
  termName: string;
  lessonName: string;
  latestScore: number;
  passMark: number;
  isPassed: boolean;
  finalizedAttemptsCount: number;
  maxAttempts: number;
  mostRecentDate: string;
  rawDate: number;
  hasReassessment: boolean;
  statusText: "Passed" | "Failed" | "In Progress";
}

const QuizHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [rawAttempts, setRawAttempts] = useState<QuizAttemptRaw[]>([]);
  const [rawQuizzes, setRawQuizzes] = useState<QuizRaw[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");
  const [selectedLesson, setSelectedLesson] = useState<string>("ALL");
  const [selectedResult, setSelectedResult] = useState<"ALL" | "PASSED" | "FAILED">("ALL");

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers = { Authorization: `Token ${token}` };

      const [attemptsRes, quizzesRes] = await Promise.all([
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/quizzes/", { headers }),
      ]);

      if (!attemptsRes.ok) throw new Error("Failed to load attempt history.");

      const rawAttemptsData = await attemptsRes.json();
      const attemptsData: QuizAttemptRaw[] = Array.isArray(rawAttemptsData)
        ? rawAttemptsData
        : rawAttemptsData?.results || [];

      const rawQuizzesData = quizzesRes.ok ? await quizzesRes.json() : [];
      const quizzesData: QuizRaw[] = Array.isArray(rawQuizzesData)
        ? rawQuizzesData
        : rawQuizzesData?.results || [];

      setRawAttempts(attemptsData);
      setRawQuizzes(quizzesData);
    } catch (err: any) {
      console.error("Error fetching quiz history:", err);
      setError(err.message || "Failed to load quiz history.");
    } finally {
      setLoading(false);
    }
  };

  // Group attempts by quiz ID (Requirement: Each quiz appears ONCE in history list)
  const groupedRecords: QuizGroupedRecord[] = useMemo(() => {
    const quizMap = new Map<number, QuizRaw>();
    rawQuizzes.forEach((q) => quizMap.set(q.id, q));

    const attemptsByQuiz = new Map<number, QuizAttemptRaw[]>();
    rawAttempts.forEach((att) => {
      const list = attemptsByQuiz.get(att.quiz) || [];
      list.push(att);
      attemptsByQuiz.set(att.quiz, list);
    });

    const records: QuizGroupedRecord[] = [];

    attemptsByQuiz.forEach((quizAttempts, quizId) => {
      const quizObj = quizMap.get(quizId);
      const title = quizObj?.title || quizAttempts[0]?.quiz_title || `Quiz #${quizId}`;
      const termName = quizObj?.term_name || quizAttempts[0]?.term_name || "Term 1";
      const lessonName = quizObj?.lesson_title || quizAttempts[0]?.lesson_title || "General Lesson";
      const passMark = quizObj?.pass_mark ?? 60;
      const maxAttempts = quizObj?.max_attempts ?? 3;

      // Filter finalized ordinary attempts
      const ordinaryFinalized = quizAttempts.filter(
        (a) =>
          (a.status === "SUBMITTED" || a.status === "EXPIRED") &&
          (!a.attempt_type || a.attempt_type === "ORDINARY")
      );

      const hasReassessment = quizAttempts.some((a) => a.attempt_type === "REASSESSMENT");

      if (ordinaryFinalized.length === 0) return; // Skip if no finalized ordinary attempt

      // Sort by attempt_number descending to find the latest completed ordinary attempt
      ordinaryFinalized.sort((a, b) => b.attempt_number - a.attempt_number);
      const latestAtt = ordinaryFinalized[0];

      const latestScore = latestAtt.score ?? 0;
      const isPassed = latestScore >= passMark;

      // Find the most recent date across ordinary finalized attempts
      const dates = ordinaryFinalized.map((a) => new Date(a.end_time || a.start_time).getTime());
      const maxTime = Math.max(...dates);
      const mostRecentDateStr = new Date(maxTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      records.push({
        quizId,
        title,
        termName,
        lessonName,
        latestScore,
        passMark,
        isPassed,
        finalizedAttemptsCount: ordinaryFinalized.length,
        maxAttempts,
        mostRecentDate: mostRecentDateStr,
        rawDate: maxTime,
        hasReassessment,
        statusText: isPassed ? "Passed" : "Failed",
      });
    });

    // Default sorting: Most recent completed activity first
    records.sort((a, b) => b.rawDate - a.rawDate);
    return records;
  }, [rawAttempts, rawQuizzes]);

  // Extract distinct terms & lessons for filter dropdowns
  const availableTerms = useMemo(() => {
    const set = new Set<string>();
    groupedRecords.forEach((r) => set.add(r.termName));
    return Array.from(set);
  }, [groupedRecords]);

  const availableLessons = useMemo(() => {
    const set = new Set<string>();
    groupedRecords.forEach((r) => set.add(r.lessonName));
    return Array.from(set);
  }, [groupedRecords]);

  // Filter records based on active user filters
  const filteredRecords = useMemo(() => {
    return groupedRecords.filter((rec) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.lessonName.toLowerCase().includes(searchQuery.toLowerCase());

      // Term filter
      const matchesTerm = selectedTerm === "ALL" || rec.termName === selectedTerm;

      // Lesson filter
      const matchesLesson = selectedLesson === "ALL" || rec.lessonName === selectedLesson;

      // Result filter
      const matchesResult =
        selectedResult === "ALL" ||
        (selectedResult === "PASSED" && rec.isPassed) ||
        (selectedResult === "FAILED" && !rec.isPassed);

      return matchesSearch && matchesTerm && matchesLesson && matchesResult;
    });
  }, [groupedRecords, searchQuery, selectedTerm, selectedLesson, selectedResult]);

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
        onClick={() => navigate("/student/progress")}
      >
        <ArrowLeft size={16} />
        <span>Back to My Progress</span>
      </button>

      <ProgressHeader
        title="Quiz History"
        subtitle="Review your completed quizzes and previous results."
      />

      {/* Filter Controls Bar */}
      <div
        className="student-card"
        style={{
          marginTop: "24px",
          padding: "20px 24px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search
            size={18}
            color="#5D78A3"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search quiz or lesson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="student-input"
            style={{ paddingLeft: "40px", width: "100%" }}
          />
        </div>

        {/* Term Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color="#5D78A3" />
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="student-select"
            style={{ minWidth: "140px" }}
          >
            <option value="ALL">All Terms</option>
            {availableTerms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Dropdown */}
        <select
          value={selectedLesson}
          onChange={(e) => setSelectedLesson(e.target.value)}
          className="student-select"
          style={{ minWidth: "160px" }}
        >
          <option value="ALL">All Lessons</option>
          {availableLessons.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        {/* Result Filter */}
        <div style={{ display: "flex", borderRadius: "8px", border: "1px solid #DCE6F3", overflow: "hidden" }}>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              border: "none",
              background: selectedResult === "ALL" ? "#126BFF" : "#FFFFFF",
              color: selectedResult === "ALL" ? "#FFFFFF" : "#0B1F3A",
              fontWeight: selectedResult === "ALL" ? 600 : 500,
              cursor: "pointer",
            }}
            onClick={() => setSelectedResult("ALL")}
          >
            All
          </button>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              border: "none",
              background: selectedResult === "PASSED" ? "#16B978" : "#FFFFFF",
              color: selectedResult === "PASSED" ? "#FFFFFF" : "#0B1F3A",
              fontWeight: selectedResult === "PASSED" ? 600 : 500,
              cursor: "pointer",
            }}
            onClick={() => setSelectedResult("PASSED")}
          >
            Passed
          </button>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              border: "none",
              background: selectedResult === "FAILED" ? "#FF4054" : "#FFFFFF",
              color: selectedResult === "FAILED" ? "#FFFFFF" : "#0B1F3A",
              fontWeight: selectedResult === "FAILED" ? 600 : 500,
              cursor: "pointer",
            }}
            onClick={() => setSelectedResult("FAILED")}
          >
            Failed
          </button>
        </div>
      </div>

      {/* History Records */}
      {loading ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center", marginTop: "24px" }}>
          <div className="student-loading-spinner" style={{ margin: "0 auto 16px auto" }} />
          <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Loading quiz history...</p>
        </div>
      ) : error ? (
        <div className="student-card" style={{ padding: "32px", marginTop: "24px", borderColor: "#FF4054" }}>
          <p style={{ color: "#FF4054", fontWeight: 600, margin: 0 }}>{error}</p>
          <button
            type="button"
            className="student-btn-primary"
            style={{ marginTop: "16px" }}
            onClick={fetchHistoryData}
          >
            Retry
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center", marginTop: "24px" }}>
          <p style={{ fontSize: "16px", color: "#0B1F3A", fontWeight: 600, margin: 0 }}>
            No matching quiz history found.
          </p>
          <p style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
            Try adjusting your search query or filter options.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredRecords.map((rec) => (
            <div
              key={rec.quizId}
              className="student-card"
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "260px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: rec.isPassed ? "#E9FBF4" : "#FFF1F3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {rec.isPassed ? (
                    <CheckCircle2 size={24} color="#16B978" />
                  ) : (
                    <XCircle size={24} color="#FF4054" />
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
                    {rec.title}
                  </h4>
                  <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
                    {rec.termName} &bull; Lesson: {rec.lessonName}
                  </div>
                </div>
              </div>

              {/* Stat Pillars */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "32px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>Latest Score</div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: rec.isPassed ? "#16B978" : "#FF4054",
                      marginTop: "2px",
                    }}
                  >
                    {rec.latestScore}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>Overall Status</div>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: rec.isPassed ? "#E9FBF4" : "#FFF1F3",
                        color: rec.isPassed ? "#16B978" : "#FF4054",
                      }}
                    >
                      {rec.statusText}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>Ordinary Attempts</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginTop: "2px" }}>
                    {rec.finalizedAttemptsCount} / {rec.maxAttempts}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>Last Activity</div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#0B1F3A",
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={13} color="#5D78A3" />
                    <span>{rec.mostRecentDate}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="student-btn-primary"
                  style={{ padding: "8px 18px", fontSize: "14px" }}
                  onClick={() => navigate(`/student/progress/quiz/${rec.quizId}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizHistoryPage;
