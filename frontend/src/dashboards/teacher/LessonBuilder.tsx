import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import "../../styles/teacher.css";

const Card = ({ children, style }: any) => (
  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", ...style }}>
    {children}
  </div>
);

const LessonBuilder = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // New Material State
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("VIDEO");
  const [newContent, setNewContent] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  // Engagement Question State
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [newQText, setNewQText] = useState("");
  const [newQType, setNewQType] = useState("MCQ");
  const [newQOptions, setNewQOptions] = useState<string[]>(["", ""]);
  const [newQCorrect, setNewQCorrect] = useState("");
  const [newQTime, setNewQTime] = useState("");

  const fetchLessonData = async () => {
    const token = getToken();
    try {
      const lessonRes = await fetch(`/api/quizzes/lessons/${lessonId}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      if (lessonRes.ok) {
        setLesson(await lessonRes.json());
      }
      
      const materialsRes = await fetch(`/api/quizzes/materials/?lesson=${lessonId}`, {
        headers: { Authorization: `Token ${token}` }
      });
      if (materialsRes.ok) {
        setMaterials(await materialsRes.json());
      }
    } catch (err: any) {
      setError(err.message || "Failed to load lesson builder.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessonData();
  }, [lessonId]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch("/api/quizzes/materials/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          material_type: newType,
          content: newContent,
          lesson: lessonId,
          is_required: isRequired
        })
      });
      if (res.ok) {
        setIsAddingMaterial(false);
        setNewTitle("");
        setNewContent("");
        fetchLessonData();
      } else {
        alert("Failed to add material.");
      }
    } catch (e) {
      alert("Error adding material.");
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!window.confirm("Delete this material?")) return;
    const token = getToken();
    await fetch(`/api/quizzes/materials/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` }
    });
    fetchLessonData();
  };

  const handleAddEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    try {
      const payload = {
        material: activeMaterialId,
        question_text: newQText,
        question_type: newQType,
        options: newQType === "MCQ" ? newQOptions.filter(o => o.trim() !== "") : {"True": "True", "False": "False"},
        correct_answer: newQCorrect,
        timestamp: newQTime ? parseInt(newQTime) : null
      };

      const res = await fetch("/api/quizzes/engagement-questions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setActiveMaterialId(null);
        setNewQText("");
        setNewQCorrect("");
        setNewQTime("");
        fetchLessonData();
      } else {
        alert("Failed to add engagement question.");
      }
    } catch (e) {
      alert("Error adding engagement question.");
    }
  };

  if (loading) return <div>Loading Builder...</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2>Lesson Builder: {lesson?.title}</h2>
        <button onClick={() => navigate(-1)} className="teacher-btn-secondary">Back</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {materials.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ color: "#64748b", marginBottom: "16px" }}>No learning materials yet</h3>
              <p style={{ color: "#94a3b8", marginBottom: "24px" }}>Create learning materials that students can study when they need additional support.</p>
              <button onClick={() => setIsAddingMaterial(true)} className="teacher-btn-primary">+ Add Material</button>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
               <button onClick={() => setIsAddingMaterial(true)} className="teacher-btn-primary">+ Add Material</button>
            </div>
            {materials.map((mat: any, index: number) => (
              <Card key={mat.id}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", margin: 0 }}>{mat.title}</h3>
                    <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>{mat.material_type} • {mat.is_required ? "Required" : "Optional"}</span>
                  </div>
                  <button onClick={() => handleDeleteMaterial(mat.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                </div>
                
                {mat.material_type === "VIDEO" && (
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
                    URL: {mat.content}
                  </div>
                )}
                
                <div style={{ marginTop: "16px" }}>
                  <h4 style={{ fontSize: "14px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                    Engagement Questions
                    <button onClick={() => setActiveMaterialId(mat.id)} style={{ fontSize: "12px", background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}>+ Add Question</button>
                  </h4>
                  
                  {mat.engagement_questions && mat.engagement_questions.length > 0 ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {mat.engagement_questions.map((eq: any) => (
                        <li key={eq.id} style={{ fontSize: "13px", padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                          <span>{eq.question_text}</span>
                          <span style={{ color: "#64748b" }}>{eq.timestamp ? `@ ${eq.timestamp}s` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>No engagement questions added.</div>
                  )}
                </div>
              </Card>
            ))}
          </>
        )}

        {isAddingMaterial && (
          <Card>
            <h3 style={{ margin: "0 0 16px 0" }}>Add New Material</h3>
            <form onSubmit={handleAddMaterial} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="teacher-form-input" />
              <select value={newType} onChange={e => setNewType(e.target.value)} className="teacher-dropdown-filter">
                <option value="VIDEO">Video</option>
                <option value="TEXT">Text Notes</option>
                <option value="PDF">PDF Document</option>
              </select>
              <textarea placeholder={newType === "VIDEO" ? "Video URL" : "Content"} value={newContent} onChange={e => setNewContent(e.target.value)} required className="teacher-form-input" />
              <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} />
                Required for completion
              </label>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsAddingMaterial(false)} className="teacher-btn-secondary">Cancel</button>
                <button type="submit" className="teacher-btn-primary">Save Material</button>
              </div>
            </form>
          </Card>
        )}
        
        {activeMaterialId && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <Card style={{ width: "500px" }}>
              <h3 style={{ margin: "0 0 16px 0" }}>Add Engagement Question</h3>
              <form onSubmit={handleAddEngagement} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input placeholder="Question Text" value={newQText} onChange={e => setNewQText(e.target.value)} required className="teacher-form-input" />
                <select value={newQType} onChange={e => setNewQType(e.target.value)} className="teacher-dropdown-filter">
                  <option value="MCQ">Multiple Choice</option>
                  <option value="TF">True/False</option>
                </select>
                
                {newQType === "MCQ" && (
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Options (Comma separated or enter manually)</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                      {newQOptions.map((opt, i) => (
                        <input key={i} value={opt} onChange={e => {
                          const newOpts = [...newQOptions];
                          newOpts[i] = e.target.value;
                          setNewQOptions(newOpts);
                        }} placeholder={`Option ${i+1}`} className="teacher-form-input" />
                      ))}
                      <button type="button" onClick={() => setNewQOptions([...newQOptions, ""])} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px" }}>+ Add Option</button>
                    </div>
                  </div>
                )}
                
                <input placeholder="Correct Answer" value={newQCorrect} onChange={e => setNewQCorrect(e.target.value)} required className="teacher-form-input" />
                <input placeholder="Timestamp in seconds (for video)" type="number" value={newQTime} onChange={e => setNewQTime(e.target.value)} className="teacher-form-input" />
                
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button type="button" onClick={() => setActiveMaterialId(null)} className="teacher-btn-secondary">Cancel</button>
                  <button type="submit" className="teacher-btn-primary">Save Question</button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default LessonBuilder;
