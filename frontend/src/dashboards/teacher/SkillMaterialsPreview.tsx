import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Target,
  Play,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Paperclip,
  CheckCircle2,
  Lock,
} from "lucide-react";
import "../../styles/teacher.css";

const SkillMaterialsPreview: React.FC = () => {
  const { lessonId, skillId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [skill, setSkill] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Engagement Question state for non-video notes preview
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    fetchData();
  }, [lessonId, skillId]);

  const fetchData = async () => {
    const token = getToken();
    setLoading(true);
    setError("");

    try {
      // Fetch Lesson details, Skill details, and Materials for this lesson+skill
      const [lessonRes, skillRes, materialsRes] = await Promise.all([
        fetch(`/api/quizzes/lessons/${lessonId}/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch(`/api/quizzes/skills/${skillId}/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch(`/api/quizzes/materials/?lesson=${lessonId}&skill=${skillId}`, {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      if (lessonRes.ok) {
        setLesson(await lessonRes.json());
      }
      if (skillRes.ok) {
        setSkill(await skillRes.json());
      }

      if (materialsRes.ok) {
        const mats = await materialsRes.json();
        const matList = Array.isArray(mats) ? mats : mats.results || [];
        setMaterials(matList);
        if (matList.length > 0) {
          setActiveMaterial(matList[0]);
        }
      } else if (materialsRes.status === 403) {
        setError("You do not have permission to view materials for this lesson and skill.");
      } else {
        setError("Failed to load materials.");
      }
    } catch (e) {
      console.error("Error fetching preview data:", e);
      setError("Error loading material preview.");
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = materials.findIndex((m) => m.id === activeMaterial?.id);
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < materials.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setActiveMaterial(materials[activeIndex - 1]);
      setActiveQuestion(null);
      setShowExplanation(false);
      setSelectedOption("");
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setActiveMaterial(materials[activeIndex + 1]);
      setActiveQuestion(null);
      setShowExplanation(false);
      setSelectedOption("");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#5D78A3" }}>
        Loading Student Material Preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", padding: "24px" }}>
        <button
          onClick={() => navigate("/teacher/materials")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "#126BFF",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          <ArrowLeft size={18} /> Back to Materials
        </button>
        <div
          style={{
            color: "#FF4054",
            padding: "20px",
            backgroundColor: "#FDEDED",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "600",
            border: "1px solid #FADCDC",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1240px",
        margin: "0 auto",
        padding: "24px 32px 100px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* 1. Header Bar & Context */}
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
            onClick={() => navigate("/teacher/materials")}
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
              transition: "all 0.15s ease",
            }}
          >
            <ArrowLeft size={18} />
            Back to Materials
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={16} color="#126BFF" />
                <span style={{ fontSize: "13px", color: "#5D78A3" }}>Lesson:</span>
                <strong style={{ fontSize: "15px", color: "#0B1F3A" }}>
                  {lesson?.title || `Lesson #${lessonId}`}
                </strong>
              </div>
              <span style={{ color: "#CBD5E0" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Target size={16} color="#126BFF" />
                <span style={{ fontSize: "13px", color: "#5D78A3" }}>Skill:</span>
                <strong style={{ fontSize: "15px", color: "#126BFF" }}>
                  {skill?.name || `Skill #${skillId}`}
                </strong>
              </div>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
              Previewing Student view sequence ({materials.length} {materials.length === 1 ? "Material" : "Materials"})
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#EFF6FF",
            color: "#126BFF",
            border: "1px solid #BAE0FF",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "12.5px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          <Eye size={16} />
          Student View Preview (Read-Only)
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
            No learning materials exist for this skill yet.
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
                  {/* Step Badge */}
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      backgroundColor: isSelected ? "#126BFF" : "#EFF6FF",
                      color: isSelected ? "#FFFFFF" : "#126BFF",
                      fontSize: "12px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Step Type & Title */}
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

      {/* 3. Expanded Full-Width Material Viewer Container */}
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
            {/* Active Material Header */}
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      backgroundColor:
                        activeMaterial.material_type === "VIDEO" ? "#F1EDFF" : "#EAF3FF",
                      color: activeMaterial.material_type === "VIDEO" ? "#6C4BFF" : "#126BFF",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    {activeMaterial.material_type}
                  </span>
                  <span style={{ fontSize: "13px", color: "#5D78A3" }}>
                    {skill?.name || "Skill Content"}
                  </span>
                </div>
                <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#0B1F3A", margin: "8px 0 0 0" }}>
                  {activeMaterial.title}
                </h1>
              </div>
            </div>

            {/* Material Content Rendering */}
            {activeMaterial.material_type === "VIDEO" ? (
              <div style={{ width: "100%", flex: 1 }}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    maxHeight: "640px",
                    backgroundColor: "#111111",
                    borderRadius: "12px",
                    overflow: "hidden",
                    marginBottom: "20px",
                  }}
                >
                  <video
                    src={activeMaterial.file}
                    controls
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                  />
                </div>

                {/* Video Checkpoints / Questions Preview */}
                {activeMaterial.video_questions && activeMaterial.video_questions.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #DCE6F3",
                      borderRadius: "12px",
                      padding: "20px",
                      marginTop: "20px",
                    }}
                  >
                    <h4 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Timeline Quiz Checkpoints ({activeMaterial.video_questions.length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {activeMaterial.video_questions.map((vq: any, i: number) => (
                        <div
                          key={vq.id || i}
                          style={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#126BFF", marginRight: "10px" }}>
                              {Math.floor(vq.timestamp / 60)}:
                              {String(Math.floor(vq.timestamp % 60)).padStart(2, "0")}
                            </span>
                            <span style={{ fontSize: "14px", color: "#0B1F3A", fontWeight: "600" }}>
                              {vq.question_text}
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#5D78A3", backgroundColor: "#F1F5F9", padding: "3px 8px", borderRadius: "4px" }}>
                            {vq.question_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                  boxSizing: "border-box",
                }}
              >
                {activeMaterial.content ? (
                  <div dangerouslySetInnerHTML={{ __html: activeMaterial.content }} />
                ) : (
                  <p style={{ color: "#94A3B8", fontStyle: "italic" }}>No text content written for this note.</p>
                )}

                {/* Attachments / Documents Preview */}
                {activeMaterial.attachments && activeMaterial.attachments.length > 0 && (
                  <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
                    <h4 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Attachments & Documents ({activeMaterial.attachments.length})
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

            {/* Engagement Questions Preview (Read-Only Interactive Preview) */}
            {activeMaterial.material_type !== "VIDEO" &&
              activeMaterial.engagement_questions &&
              activeMaterial.engagement_questions.length > 0 && (
                <div
                  style={{
                    marginTop: "28px",
                    borderTop: "2px dashed #E2E8F0",
                    paddingTop: "24px",
                  }}
                >
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0B1F3A", marginBottom: "16px" }}>
                    Check Your Understanding (Interactive Question Preview)
                  </h3>

                  {activeQuestion ? (
                    <div
                      style={{
                        backgroundColor: "#F0FDF4",
                        padding: "24px",
                        borderRadius: "12px",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: "16px", color: "#0B1F3A", marginBottom: "16px" }}>
                        {activeQuestion.question_text}
                      </p>

                      {!showExplanation ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {activeQuestion.question_type === "MCQ"
                            ? activeQuestion.options.map((opt: string, i: number) => (
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
                                    name="preview_eq"
                                    value={opt}
                                    checked={selectedOption === opt}
                                    onChange={() => setSelectedOption(opt)}
                                  />
                                  <span style={{ fontSize: "14.5px", color: "#0B1F3A" }}>{opt}</span>
                                </label>
                              ))
                            : ["True", "False"].map((opt) => (
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
                                    name="preview_eq"
                                    value={opt}
                                    checked={selectedOption === opt}
                                    onChange={() => setSelectedOption(opt)}
                                  />
                                  <span style={{ fontSize: "14.5px", color: "#0B1F3A" }}>{opt}</span>
                                </label>
                              ))}

                          <button
                            type="button"
                            onClick={() => setShowExplanation(true)}
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
                            Check Answer (Preview)
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 600,
                              color:
                                selectedOption === activeQuestion.correct_answer
                                  ? "#16A34A"
                                  : "#DC2626",
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
                            Close Question Preview
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
                          Preview Question {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* Bottom Sequence Navigation */}
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
                Previous Material
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
                Next Material
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "300px",
              color: "#94A3B8",
            }}
          >
            Select a material step above to preview.
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillMaterialsPreview;
