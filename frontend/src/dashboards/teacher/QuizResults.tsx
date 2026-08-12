import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import "../../styles/teacher.css";

type QuizDetails = {
  id: number;
  title: string;
  lesson_title: string;
};

type QuizAttempt = {
  id: number;
  student_name: string;
  student_email: string;
  attempt_number: number;
  start_time: string;
  end_time: string;
  score: number;
};

const QuizResults = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      const token = getToken();
      try {
        const [quizRes, attemptsRes] = await Promise.all([
          fetch(`/api/quizzes/${quizId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/attempts/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!quizRes.ok || !attemptsRes.ok) {
          throw new Error("Unable to load quiz results.");
        }

        const quizData = await quizRes.json() as QuizDetails;
        const attemptsData = await attemptsRes.json() as any[];

        // Filter attempts for this quiz
        const filteredAttempts = attemptsData
          .filter(att => att.quiz === parseInt(quizId || "0", 10))
          .map(att => ({
            id: att.id,
            student_name: att.student_name,
            student_email: att.student_email,
            attempt_number: att.attempt_number,
            start_time: att.start_time,
            end_time: att.end_time,
            score: att.score
          }));

        setQuiz(quizData);
        setAttempts(filteredAttempts);
      } catch (err: any) {
        setError(err.message || "Failed to load quiz results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [quizId]);

  const getDurationString = (start: string, end: string): string => {
    if (!start || !end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return "-";
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Analyzing quiz results...</div>;
  }

  if (error || !quiz) {
    return (
      <div className="teacher-card" style={{ padding: "24px", color: "#ef4444" }}>
        <h3>Error Loading Results</h3>
        <p>{error || "Quiz not found."}</p>
        <Link to="/teacher/quizzes" className="teacher-btn-secondary" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none" }}>Back to List</Link>
      </div>
    );
  }

  // Calculate Aggregates
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts) 
    : 0;
  
  const passingAttempts = attempts.filter(att => att.score >= 50).length;
  const passRate = totalAttempts > 0 
    ? Math.round((passingAttempts / totalAttempts) * 100) 
    : 0;

  // Score brackets
  const brackets = {
    excellent: attempts.filter(a => a.score >= 80).length, // 80-100
    good: attempts.filter(a => a.score >= 60 && a.score < 80).length, // 60-79
    average: attempts.filter(a => a.score >= 40 && a.score < 60).length, // 40-59
    struggling: attempts.filter(a => a.score < 40).length, // 0-39
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Back Button */}
      <div>
        <button 
          onClick={() => navigate("/teacher/quizzes")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Quizzes
        </button>
      </div>

      {/* Header Panel */}
      <div className="teacher-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Results Breakdown</span>
            <h2 className="teacher-card-title" style={{ fontSize: "22px", marginTop: "4px" }}>{quiz.title}</h2>
            <span style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", display: "block" }}>Lesson: <strong>{quiz.lesson_title}</strong></span>
          </div>
          <button className="teacher-btn-secondary" onClick={() => navigate("/teacher/quizzes")}>Back to Quizzes</button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="teacher-metrics-grid">
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Total Submissions</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px" }}>{totalAttempts}</span>
          </div>
        </div>
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Average Score</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px", color: avgScore >= 60 ? "#10b981" : "#ef4444" }}>{avgScore}%</span>
          </div>
        </div>
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Pass Rate (≥ 50%)</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px", color: passRate >= 70 ? "#10b981" : "#f59e0b" }}>{passRate}%</span>
          </div>
        </div>
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Struggling ({"<"} 40%)</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px", color: brackets.struggling > 0 ? "#ef4444" : "#64748b" }}>{brackets.struggling}</span>
          </div>
        </div>
      </div>

      {/* Distribution and details */}
      <div className="teacher-dashboard-grid">
        {/* Left: Attempts list */}
        <div className="teacher-card" style={{ gridColumn: "span 2" }}>
          <h3 className="teacher-card-title" style={{ marginBottom: "16px" }}>Submissions List</h3>
          
          <div className="teacher-table-container">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student Email</th>
                  <th>Attempt No.</th>
                  <th>Score</th>
                  <th>Duration</th>
                  <th>Completed At</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td style={{ fontWeight: 600 }}>{attempt.student_name}</td>
                    <td style={{ color: "#64748b" }}>{attempt.student_email}</td>
                    <td>{attempt.attempt_number}</td>
                    <td style={{ fontWeight: 700, color: attempt.score >= 80 ? "#10b981" : attempt.score >= 50 ? "#3b82f6" : "#ef4444" }}>
                      {attempt.score}%
                    </td>
                    <td>{getDurationString(attempt.start_time, attempt.end_time)}</td>
                    <td style={{ fontSize: "13px", color: "#64748b" }}>
                      {new Date(attempt.start_time).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                      No attempts registered for this quiz yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
