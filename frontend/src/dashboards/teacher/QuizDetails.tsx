import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { Trash2, AlertCircle } from "lucide-react";
import "../../styles/teacher.css";

type QuizDetailsType = {
  id: number;
  title: string;
  description: string;
  lesson: number;
  lesson_title: string;
  learning_level: string;
  created_at: string;
  questions: any[];
};

const QuizDetails = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<QuizDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetails = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/${quizId}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error("Could not load quiz details.");
        const data = await res.json() as QuizDetailsType;
        setQuiz(data);
      } catch (err: any) {
        setError(err.message || "Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [quizId]);

  const handleDelete = async () => {
    if (!quiz) return;
    setDeleting(true);
    setDeleteError("");
    const token = getToken();
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        navigate("/teacher/quizzes");
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.detail || "Failed to delete quiz.");
      }
    } catch (err) {
      setDeleteError("Error connecting to server.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Retrieving quiz details...</div>;
  }

  if (error || !quiz) {
    return (
      <div className="teacher-card" style={{ padding: "24px", color: "#ef4444" }}>
        <h3>Error Loading Quiz</h3>
        <p>{error || "Quiz not found."}</p>
        <Link to="/teacher/quizzes" className="teacher-btn-secondary" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none" }}>Back to List</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
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
      {/* Header card */}
      <div className="teacher-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <span className={`teacher-badge ${quiz.learning_level === "Beginner" ? "success" : quiz.learning_level === "Intermediate" ? "warning" : "danger"}`} style={{ marginBottom: "8px" }}>
              {quiz.learning_level} Level
            </span>
            <h2 className="teacher-card-title" style={{ fontSize: "22px" }}>{quiz.title}</h2>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="teacher-btn-secondary" onClick={() => navigate("/teacher/quizzes")}>Back to Quizzes</button>
            <button className="teacher-btn-primary" onClick={() => navigate(`/teacher/quizzes/${quiz.id}/edit`)}>Edit Quiz</button>
            <button 
              onClick={() => { setShowDeleteModal(true); setDeleteError(""); }}
              style={{ 
                padding: "8px 16px", 
                borderRadius: "8px", 
                border: "1px solid #FFB8BE", 
                backgroundColor: "#FFF5F5", 
                color: "#FF3347", 
                fontSize: "14px", 
                fontWeight: "600", 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Trash2 size={16} />
              Delete Quiz
            </button>
          </div>
        </div>
        <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" }}>{quiz.description}</p>
        
        <div style={{ display: "flex", gap: "24px", borderTop: "1px solid var(--teacher-border)", marginTop: "20px", paddingTop: "16px", fontSize: "13px", color: "#64748b" }}>
          <span>Lesson: <strong>{quiz.lesson_title}</strong></span>
          <span>Created: <strong>{new Date(quiz.created_at).toLocaleDateString()}</strong></span>
          <span>Questions Count: <strong>{quiz.questions?.length || 0}</strong></span>
        </div>
      </div>

      {/* Questions list */}
      <div className="teacher-card">
        <h3 className="teacher-card-title" style={{ fontSize: "16px", marginBottom: "20px" }}>Questions List</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {quiz.questions?.map((q, idx) => (
            <div key={q.id || idx} style={{ border: "1px solid var(--teacher-border)", borderRadius: "12px", padding: "16px", backgroundColor: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>Question {idx + 1}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span className="teacher-badge" style={{ backgroundColor: "#e2e8f0", fontSize: "11px" }}>{q.question_type}</span>
                </div>
              </div>
              
              <p style={{ fontWeight: 600, fontSize: "15px", marginBottom: "14px" }}>{q.question_text}</p>
              
              {q.question_type === "MCQ" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {q.answers?.map((ans: any, aIdx: number) => (
                    <div
                      key={ans.id || aIdx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: ans.is_correct ? "#10b981" : "#e2e8f0",
                        backgroundColor: ans.is_correct ? "#ecfdf5" : "white",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <span style={{ color: ans.is_correct ? "#10b981" : "#94a3b8" }}>{ans.is_correct ? "✓" : "○"}</span>
                      <span style={{ fontWeight: ans.is_correct ? 600 : 400 }}>{ans.answer_text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "inline-block", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#eff6ff", border: "1px dashed #bfdbfe", fontSize: "13px" }}>
                  Correct Numeric Value: <strong>{q.correct_value}</strong>
                </div>
              )}

              {q.hints?.length > 0 && (
                <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: "16px", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "6px" }}>Hints</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {q.hints.map((h: any, hIdx: number) => (
                      <span key={h.id || hIdx} style={{ fontSize: "12px", color: "#475569" }}>
                        💡 #{h.sequence_no}: {h.hint_text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!quiz.questions || quiz.questions.length === 0) && (
            <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>This quiz has no questions.</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 31, 58, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(11, 31, 58, 0.2)",
            width: "100%",
            maxWidth: "440px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#FFE5E8",
                color: "#FF3347",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>Delete Quiz</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>This action cannot be undone.</p>
              </div>
            </div>

            <p style={{ fontSize: "14px", color: "#334155", margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{quiz.title}"</strong>? All associated questions and attempt records will be permanently removed.
            </p>

            {deleteError && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#FFF5F5", border: "1px solid #FFB8BE", color: "#FF3347", fontSize: "13px" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                disabled={deleting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#FFFFFF",
                  color: "#3D5E8A",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#FF3347",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {deleting ? "Deleting..." : "Delete Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDetails;
