import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import "../../styles/teacher.css";

type StudentProfile = {
  id: number;
  full_name: string;
};

type ProgressAttempt = {
  id: number;
  quiz_title: string;
  attempt_number: number;
  score: number;
  start_time: string;
  end_time: string;
};

const StudentProgress = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attempts, setAttempts] = useState<ProgressAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgress = async () => {
      const token = getToken();
      try {
        const [studentRes, attemptsRes] = await Promise.all([
          fetch(`/api/accounts/users/${studentId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/attempts/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!studentRes.ok || !attemptsRes.ok) {
          throw new Error("Unable to fetch progress metrics.");
        }

        const studentData = await studentRes.json() as StudentProfile;
        const attemptsData = await attemptsRes.json() as any[];

        // Filter and map attempts
        const studentAttempts = attemptsData
          .filter(att => att.student === parseInt(studentId || "0", 10))
          .map(att => ({
            id: att.id,
            quiz_title: att.quiz_title,
            attempt_number: att.attempt_number,
            score: att.score,
            start_time: att.start_time,
            end_time: att.end_time
          }))
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        setStudent(studentData);
        setAttempts(studentAttempts);
      } catch (err: any) {
        setError(err.message || "Failed to load student progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [studentId]);

  const getDurationString = (start: string, end: string): string => {
    if (!start || !end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return "-";
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Fetching progress profile...</div>;
  }

  if (error || !student) {
    return (
      <div className="teacher-card" style={{ padding: "24px", color: "#ef4444" }}>
        <h3>Error Loading Progress</h3>
        <p>{error || "Student not found."}</p>
        <Link to="/teacher/students" className="teacher-btn-secondary" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none" }}>Back to List</Link>
      </div>
    );
  }

  // Calculate student specific progress aggregates
  const totalCompleted = attempts.length;
  const avgScore = totalCompleted > 0 
    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / totalCompleted)
    : 0;
  
  const maxScore = totalCompleted > 0
    ? Math.max(...attempts.map(a => a.score))
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header Card */}
      <div className="teacher-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Performance Progress</span>
            <h2 className="teacher-card-title" style={{ fontSize: "22px", marginTop: "4px" }}>{student.full_name}</h2>
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="teacher-btn-secondary" onClick={() => navigate("/teacher/students")}>Back to Students</button>
            <button className="teacher-btn-primary" onClick={() => navigate(`/teacher/students/${studentId}`)}>View Profile</button>
          </div>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="teacher-metrics-grid">
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Quizzes Completed</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px" }}>{totalCompleted}</span>
          </div>
        </div>
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Average Score</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px", color: avgScore >= 60 ? "#10b981" : avgScore >= 45 ? "#f59e0b" : "#ef4444" }}>{avgScore}%</span>
          </div>
        </div>
        <div className="teacher-metric-card">
          <div className="teacher-metric-info">
            <span className="teacher-metric-label">Highest Score</span>
            <span className="teacher-metric-value" style={{ marginTop: "10px", color: "#10b981" }}>{maxScore}%</span>
          </div>
        </div>
      </div>

      {/* Attempts List */}
      <div className="teacher-card">
        <h3 className="teacher-card-title" style={{ marginBottom: "16px" }}>Attempts History</h3>
        
        <div className="teacher-table-container">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Attempt No</th>
                <th>Completion Time</th>
                <th>Duration</th>
                <th>Score Achieved</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td style={{ fontWeight: 600 }}>{attempt.quiz_title}</td>
                  <td>{attempt.attempt_number}</td>
                  <td style={{ fontSize: "13px", color: "#64748b" }}>
                    {new Date(attempt.start_time).toLocaleString()}
                  </td>
                  <td>{getDurationString(attempt.start_time, attempt.end_time)}</td>
                  <td style={{ fontWeight: 700, color: attempt.score >= 80 ? "#10b981" : attempt.score >= 50 ? "#3b82f6" : "#ef4444" }}>
                    {attempt.score}%
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                    This student hasn't completed any quizzes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;
