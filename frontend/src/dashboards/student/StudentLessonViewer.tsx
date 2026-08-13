import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import "../../styles/teacher.css";

const StudentLessonViewer = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);

  // Engagement Question state
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const fetchData = async () => {
    const token = getToken();
    try {
      const [lessonRes, materialsRes, progressRes] = await Promise.all([
        fetch(`/api/quizzes/lessons/${lessonId}/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/materials/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/attempts/content-progress/`, { headers: { Authorization: `Token ${token}` } })
      ]);

      if (lessonRes.ok && materialsRes.ok) {
        setLesson(await lessonRes.json());
        const mats = await materialsRes.json();
        setMaterials(mats);
        if (mats.length > 0) setActiveMaterial(mats[0]);
      }
      if (progressRes.ok) {
        setProgress(await progressRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markMaterialComplete = async (materialId: number) => {
    const token = getToken();
    await fetch(`/api/attempts/content-progress/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
      body: JSON.stringify({ material: materialId, is_completed: true })
    });
    
    // Also try to mark the lesson as complete if all materials are done
    const isLast = materials[materials.length - 1].id === materialId;
    if (isLast) {
       await fetch(`/api/attempts/lesson-progress/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
          body: JSON.stringify({ lesson: lessonId, status: "COMPLETED" })
       });
    }
    fetchData();
  };

  const submitEngagementAnswer = async () => {
    const token = getToken();
    const isCorrect = selectedOption === activeQuestion.correct_answer;
    
    await fetch(`/api/attempts/engagement-answers/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
      body: JSON.stringify({ question: activeQuestion.id, selected_answer: selectedOption, is_correct: isCorrect })
    });

    setShowExplanation(true);
  };

  if (loading) return <div>Loading Lesson...</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", display: "flex", gap: "24px" }}>
      {/* Sidebar Navigation */}
      <div style={{ width: "300px", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", height: "fit-content" }}>
        <h2 style={{ fontSize: "18px", margin: "0 0 16px 0" }}>{lesson?.title}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {materials.map((mat, idx) => {
            const isCompleted = progress.some(p => p.material === mat.id && p.is_completed);
            return (
              <button
                key={mat.id}
                onClick={() => { setActiveMaterial(mat); setActiveQuestion(null); setShowExplanation(false); }}
                style={{
                  textAlign: "left", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: activeMaterial?.id === mat.id ? "#e0f2fe" : "transparent",
                  color: activeMaterial?.id === mat.id ? "#0369a1" : "#475569",
                  fontWeight: activeMaterial?.id === mat.id ? 600 : 400
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{idx + 1}. {mat.title}</span>
                  {isCompleted && <span style={{ color: "#16a34a" }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => navigate("/student/dashboard")} style={{ width: "100%", padding: "12px", marginTop: "24px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
          Back to Dashboard
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, background: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        {activeMaterial ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ fontSize: "24px", margin: 0 }}>{activeMaterial.title}</h1>
              {!progress.some(p => p.material === activeMaterial.id && p.is_completed) && (
                <button onClick={() => markMaterialComplete(activeMaterial.id)} className="teacher-btn-primary">
                  Mark as Complete
                </button>
              )}
            </div>

            {activeMaterial.material_type === "VIDEO" ? (
              <div style={{ background: "#000", height: "400px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", marginBottom: "24px" }}>
                [Video Player Placeholder: {activeMaterial.content}]
              </div>
            ) : (
              <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", minHeight: "300px", marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                {activeMaterial.content}
              </div>
            )}

            {/* Engagement Questions */}
            {activeMaterial.engagement_questions?.length > 0 && (
              <div style={{ marginTop: "32px", borderTop: "2px dashed #e2e8f0", paddingTop: "24px" }}>
                <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Check Your Understanding</h3>
                
                {activeQuestion ? (
                  <div style={{ background: "#f0fdf4", padding: "24px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <p style={{ fontWeight: 600, fontSize: "16px", marginBottom: "16px" }}>{activeQuestion.question_text}</p>
                    
                    {!showExplanation ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {activeQuestion.question_type === "MCQ" ? (
                          activeQuestion.options.map((opt: string, i: number) => (
                            <label key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", background: "white", borderRadius: "6px", cursor: "pointer", border: selectedOption === opt ? "2px solid #3b82f6" : "1px solid #e2e8f0" }}>
                              <input type="radio" name="eq" value={opt} checked={selectedOption === opt} onChange={() => setSelectedOption(opt)} />
                              {opt}
                            </label>
                          ))
                        ) : (
                          ["True", "False"].map(opt => (
                            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", background: "white", borderRadius: "6px", cursor: "pointer", border: selectedOption === opt ? "2px solid #3b82f6" : "1px solid #e2e8f0" }}>
                              <input type="radio" name="eq" value={opt} checked={selectedOption === opt} onChange={() => setSelectedOption(opt)} />
                              {opt}
                            </label>
                          ))
                        )}
                        <button onClick={submitEngagementAnswer} disabled={!selectedOption} className="teacher-btn-primary" style={{ marginTop: "12px", alignSelf: "flex-start" }}>Submit Answer</button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: selectedOption === activeQuestion.correct_answer ? "#16a34a" : "#dc2626", marginBottom: "12px" }}>
                          {selectedOption === activeQuestion.correct_answer ? "Correct!" : `Incorrect. The correct answer is ${activeQuestion.correct_answer}.`}
                        </div>
                        <button onClick={() => { setActiveQuestion(null); setShowExplanation(false); setSelectedOption(""); }} className="teacher-btn-secondary">Close</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    {activeMaterial.engagement_questions.map((eq: any, i: number) => (
                      <button key={eq.id} onClick={() => setActiveQuestion(eq)} style={{ padding: "12px 20px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                        Question {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
            Select a material from the left to start learning.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonViewer;
