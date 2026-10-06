import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Play, Download, BookOpen } from "lucide-react";
import InteractiveVideoPlayer from "./InteractiveVideoPlayer";
import "../../styles/teacher.css";

const StudentLessonViewer = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);

  // Engagement Question state for non-video notes
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
        const matList = Array.isArray(mats) ? mats : mats.results || [];
        setMaterials(matList);
        if (matList.length > 0) setActiveMaterial(matList[0]);
      }
      if (progressRes.ok) {
        const progData = await progressRes.json();
        setProgress(Array.isArray(progData) ? progData : progData.results || []);
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
    
    const isLast = materials[materials.length - 1]?.id === materialId;
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

  const activeIndex = materials.findIndex((m) => m.id === activeMaterial?.id);
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < materials.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setActiveMaterial(materials[activeIndex - 1]);
      setActiveQuestion(null);
      setShowExplanation(false);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setActiveMaterial(materials[activeIndex + 1]);
      setActiveQuestion(null);
      setShowExplanation(false);
    }
  };

  if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "#5D78A3" }}>Loading Lesson Content...</div>;

  return (
    <div
      style={{
        maxWidth: "1240px",
        margin: "24px auto",
        padding: "0 24px 100px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* 1. Lesson Header */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4ECF6",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            type="button"
            onClick={() => navigate("/student/my-learning")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "9px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#F8FAFC",
              color: "#3D5E8A",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="#126BFF" />
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#0B1F3A", margin: 0 }}>
                {lesson?.title}
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              Progress: {progress.filter((p) => p.is_completed).length} of {materials.length} completed
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Horizontal Material Stepper */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4ECF6",
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              color: "#3D5E8A",
              letterSpacing: "0.5px",
            }}
          >
            LEARNING SEQUENCE ({materials.length} STEPS)
          </span>
          <span style={{ fontSize: "12px", color: "#5D78A3", fontWeight: "600" }}>
            Step {activeIndex >= 0 ? activeIndex + 1 : 1} of {materials.length}
          </span>
        </div>

        {materials.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>
            No learning materials available for this lesson.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              overflowX: "auto",
              paddingBottom: "6px",
              scrollbarWidth: "thin",
              boxSizing: "border-box",
            }}
          >
            {materials.map((mat, idx) => {
              const isSelected = activeMaterial?.id === mat.id;
              const isCompleted = progress.some((p) => p.material === mat.id && p.is_completed);
              const isVideo = mat.material_type === "VIDEO";
              const isPdf = mat.material_type === "PDF";
              const typeLabel = isVideo ? "Video" : isPdf ? "PDF Document" : "Note";

              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => {
                    setActiveMaterial(mat);
                    setActiveQuestion(null);
                    setShowExplanation(false);
                    setSelectedOption("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid #126BFF" : "1px solid #DCE6F3",
                    backgroundColor: isSelected ? "#F0F6FF" : "#FFFFFF",
                    color: isSelected ? "#126BFF" : "#0B1F3A",
                    cursor: "pointer",
                    flex: "1 1 0px",
                    minWidth: "140px",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 4px 12px rgba(18, 107, 255, 0.12)" : "none",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Step Circle */}
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      backgroundColor: isCompleted ? "#16A34A" : isSelected ? "#126BFF" : "#EFF6FF",
                      color: isCompleted || isSelected ? "#FFFFFF" : "#126BFF",
                      fontSize: "12px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={16} color="#FFFFFF" /> : idx + 1}
                  </div>

                  {/* Step Title & Type */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: isSelected ? "#126BFF" : "#5D78A3",
                      }}
                    >
                      {typeLabel}
                    </span>
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "600",
                        color: "#0B1F3A",
                        whiteSpace: "nowrap",
                        width: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {mat.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Expanded Full-Width Material Content Area */}
      <div
        style={{
          width: "100%",
          backgroundColor: "#FFFFFF",
          padding: "32px",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {activeMaterial ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
                paddingBottom: "16px",
                borderBottom: "1px solid #E4ECF6",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#126BFF", textTransform: "uppercase" }}>
                  {activeMaterial.skill_name || "Skill Material"}
                </span>
                <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#0B1F3A", margin: "6px 0 0 0" }}>
                  {activeMaterial.title}
                </h1>
              </div>

              {!progress.some((p) => p.material === activeMaterial.id && p.is_completed) && (
                <button
                  type="button"
                  onClick={() => markMaterialComplete(activeMaterial.id)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#126BFF",
                    color: "white",
                    border: "none",
                    borderRadius: "9px",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(18, 107, 255, 0.20)",
                  }}
                >
                  Mark as Complete
                </button>
              )}
            </div>

            {activeMaterial.material_type === "VIDEO" ? (
              <InteractiveVideoPlayer
                key={activeMaterial.id}
                materialData={activeMaterial}
                onCompleted={() => markMaterialComplete(activeMaterial.id)}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  padding: "28px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  minHeight: "320px",
                  marginBottom: "24px",
                  fontSize: "16px",
                  lineHeight: "1.7",
                  color: "#1E293B",
                  whiteSpace: "pre-wrap",
                  boxSizing: "border-box",
                }}
              >
                {activeMaterial.content}

                {activeMaterial.attachments && activeMaterial.attachments.length > 0 && (
                  <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
                    <h4 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Attachments & Documents
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activeMaterial.attachments.map((att: any) => (
                        <a
                          key={att.id}
                          href={att.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #DCE6F3",
                            borderRadius: "10px",
                            color: "#126BFF",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          <Download size={18} />
                          {att.file.split("/").pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Engagement Questions for Non-Video Notes */}
            {activeMaterial.material_type !== "VIDEO" && activeMaterial.engagement_questions?.length > 0 && (
              <div style={{ marginTop: "28px", borderTop: "2px dashed #E2E8F0", paddingTop: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0B1F3A", marginBottom: "16px" }}>
                  Check Your Understanding
                </h3>

                {activeQuestion ? (
                  <div style={{ backgroundColor: "#F0FDF4", padding: "24px", borderRadius: "12px", border: "1px solid #BBF7D0" }}>
                    <p style={{ fontWeight: 600, fontSize: "16px", color: "#0B1F3A", marginBottom: "16px" }}>
                      {activeQuestion.question_text}
                    </p>

                    {!showExplanation ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {activeQuestion.question_type === "MCQ" ? (
                          activeQuestion.options.map((opt: string, i: number) => (
                            <label
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 16px",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                cursor: "pointer",
                                border: selectedOption === opt ? "2px solid #126BFF" : "1px solid #E2E8F0",
                              }}
                            >
                              <input
                                type="radio"
                                name="eq"
                                value={opt}
                                checked={selectedOption === opt}
                                onChange={() => setSelectedOption(opt)}
                              />
                              <span style={{ fontSize: "14.5px", color: "#0B1F3A" }}>{opt}</span>
                            </label>
                          ))
                        ) : (
                          ["True", "False"].map((opt) => (
                            <label
                              key={opt}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 16px",
                                backgroundColor: "white",
                                borderRadius: "8px",
                                cursor: "pointer",
                                border: selectedOption === opt ? "2px solid #126BFF" : "1px solid #E2E8F0",
                              }}
                            >
                              <input
                                type="radio"
                                name="eq"
                                value={opt}
                                checked={selectedOption === opt}
                                onChange={() => setSelectedOption(opt)}
                              />
                              <span style={{ fontSize: "14.5px", color: "#0B1F3A" }}>{opt}</span>
                            </label>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={submitEngagementAnswer}
                          disabled={!selectedOption}
                          style={{
                            marginTop: "12px",
                            alignSelf: "flex-start",
                            padding: "10px 22px",
                            backgroundColor: "#126BFF",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          Submit Answer
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: selectedOption === activeQuestion.correct_answer ? "#16A34A" : "#DC2626",
                            marginBottom: "14px",
                          }}
                        >
                          {selectedOption === activeQuestion.correct_answer
                            ? "Correct!"
                            : `Incorrect. The correct answer is ${activeQuestion.correct_answer}.`}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuestion(null);
                            setShowExplanation(false);
                            setSelectedOption("");
                          }}
                          style={{
                            padding: "8px 18px",
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #DCE6F3",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "13.5px",
                            color: "#3D5E8A",
                          }}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {activeMaterial.engagement_questions.map((eq: any, i: number) => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => setActiveQuestion(eq)}
                        style={{
                          padding: "10px 18px",
                          backgroundColor: "white",
                          border: "1px solid #CBD5E1",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#0B1F3A",
                        }}
                      >
                        Question {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Item Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "36px",
                paddingTop: "24px",
                borderTop: "1px solid #E4ECF6",
              }}
            >
              <button
                type="button"
                onClick={goToPrevious}
                disabled={!hasPrevious}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  borderRadius: "9px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: hasPrevious ? "#F6F9FD" : "#F1F5F9",
                  color: hasPrevious ? "#3D5E8A" : "#94A3B8",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: hasPrevious ? "pointer" : "default",
                }}
              >
                <ArrowLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                onClick={goToNext}
                disabled={!hasNext}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "9px",
                  border: "none",
                  backgroundColor: hasNext ? "#126BFF" : "#CBD5E0",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: hasNext ? "pointer" : "default",
                  boxShadow: hasNext ? "0 4px 14px rgba(18, 107, 255, 0.20)" : "none",
                }}
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "#94A3B8" }}>
            Select a material step above to start learning.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonViewer;
