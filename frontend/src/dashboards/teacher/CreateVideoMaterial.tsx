import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

const Card = ({ children, style }: any) => (
  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", ...style }}>
    {children}
  </div>
);
const Label = ({ children }: any) => <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" }}>{children}</div>;
const Input = ({ ...props }: any) => <input style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} {...props} />;
const Select = ({ children, ...props }: any) => <select style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b", backgroundColor: "#fff" }} {...props}>{children}</select>;

type VideoQuestion = {
  id?: number;
  timestamp: number;
  question_type: "MCQ" | "True / False";
  question_text: string;
  options: { text: string; is_correct: boolean }[];
};

const CreateVideoMaterial = () => {
  const navigate = useNavigate();
  const { materialId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  const [termsList, setTermsList] = useState<any[]>([]);
  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  const [termId, setTermId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [skillId, setSkillId] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [questions, setQuestions] = useState<VideoQuestion[]>([]);
  
  // Question Builder State
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [newQuestionTime, setNewQuestionTime] = useState(0);
  const [newQuestionType, setNewQuestionType] = useState<"MCQ" | "True / False">("MCQ");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState<{text: string, is_correct: boolean}[]>([
    {text: "", is_correct: true}, {text: "", is_correct: false}
  ]);

  useEffect(() => { fetchTerms(); }, []);
  const fetchTerms = async () => {
    const res = await fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${getToken()}` } });
    if (res.ok) setTermsList(await res.json());
  };

  useEffect(() => {
    if (materialId) {
      fetchMaterialDetails();
    }
  }, [materialId]);

  const fetchMaterialDetails = async () => {
    try {
      const res = await fetch(`/api/quizzes/materials/${materialId}/`, { headers: { Authorization: `Token ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setVideoUrl(data.file || "");
        if (data.lesson) {
          setLessonId(data.lesson.toString());
          // Fetch the lesson to get the term
          const lessonRes = await fetch(`/api/quizzes/lessons/${data.lesson}/`, { headers: { Authorization: `Token ${getToken()}` } });
          if (lessonRes.ok) {
            const lessonData = await lessonRes.json();
            if (lessonData.term) setTermId(lessonData.term.toString());
          }
        }
        if (data.topic) setTopicId(data.topic.toString());
        if (data.skill) setSkillId(data.skill.toString());
        if (data.video_questions) setQuestions(data.video_questions);
      }
    } catch (e) {
      console.error("Failed to load material:", e);
    }
  };

  useEffect(() => {
    if (!termId) { setLessonsList([]); return; }
    fetch(`/api/quizzes/lessons/?term=${termId}`, { headers: { Authorization: `Token ${getToken()}` } })
      .then(r => r.json()).then(setLessonsList);
  }, [termId]);

  useEffect(() => {
    if (!lessonId) { setTopicsList([]); setTopicId(""); return; }
    fetch(`/api/quizzes/topics/?lesson=${lessonId}`, { headers: { Authorization: `Token ${getToken()}` } })
      .then(r => r.json()).then(setTopicsList);
  }, [lessonId]);

  useEffect(() => {
    if (!topicId) { setSkillsList([]); setSkillId(""); return; }
    fetch(`/api/quizzes/skills/?topic=${topicId}`, { headers: { Authorization: `Token ${getToken()}` } })
      .then(r => r.json()).then(setSkillsList);
  }, [topicId]);

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleAddQuestionClick = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setNewQuestionTime(videoRef.current.currentTime);
    setShowQuestionBuilder(true);
    setNewQuestionType("MCQ");
    setNewQuestionText("");
    setNewQuestionOptions([{text: "", is_correct: true}, {text: "", is_correct: false}]);
  };

  const handleSaveQuestion = () => {
    setQuestions([...questions, {
      timestamp: newQuestionTime,
      question_type: newQuestionType,
      question_text: newQuestionText,
      options: newQuestionOptions
    }]);
    setShowQuestionBuilder(false);
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = [...questions];
    updated.splice(idx, 1);
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!title || (!videoFile && !materialId) || !lessonId) {
      setError("Title, Video File, and Lesson are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. Create or Update Learning Material
      const formData = new FormData();
      formData.append("title", title);
      formData.append("material_type", "VIDEO");
      if (videoFile) formData.append("file", videoFile);
      formData.append("lesson", lessonId);
      if (topicId) formData.append("topic", topicId);
      if (skillId) formData.append("skill", skillId);

      const url = materialId ? `/api/quizzes/materials/${materialId}/` : "/api/quizzes/materials/";
      const method = materialId ? "PATCH" : "POST";

      const matRes = await fetch(url, {
        method: method,
        headers: { Authorization: `Token ${getToken()}` },
        body: formData
      });

      if (!matRes.ok) throw new Error("Failed to save video material.");
      const matData = await matRes.json();

      // For simplicity on edit, delete old questions and create new ones
      if (materialId) {
         // Optionally we could manage IDs, but deleting and re-creating is simpler for timeline changes
         // Skip for now, assuming new ones are added and old ones removed if remove is clicked.
      }

      // 2. Add new Questions (simple implementation: only adds questions without ID)
      for (let q of questions) {
        if (!q.id) {
          await fetch("/api/quizzes/video-questions/", {
            method: "POST",
            headers: { 
              Authorization: `Token ${getToken()}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              material: matData.id,
              timestamp: q.timestamp,
              question_type: q.question_type,
              question_text: q.question_text,
              options: q.options
            })
          });
        }
      }

      navigate("/teacher/materials");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto", paddingBottom: "100px" }}>
      <button onClick={() => navigate("/teacher/materials")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}>
        Back
      </button>

      <h2>{materialId ? "Edit Interactive Video" : "Upload Interactive Video"}</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <Card>
        <div>
          <Label>Title *</Label>
          <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Intro to Fractions" />
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <Label>Term *</Label>
            <Select value={termId} onChange={(e: any) => setTermId(e.target.value)}>
              <option value="">Select</option>
              {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Lesson *</Label>
            <Select value={lessonId} onChange={(e: any) => setLessonId(e.target.value)} disabled={!termId}>
              <option value="">Select</option>
              {lessonsList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onChange={(e: any) => setTopicId(e.target.value)} disabled={!lessonId}>
              <option value="">Select</option>
              {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Skill</Label>
            <Select value={skillId} onChange={(e: any) => setSkillId(e.target.value)} disabled={!topicId}>
              <option value="">Select</option>
              {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <Label>Video File {materialId ? "(Leave empty to keep existing)" : "*"}</Label>
          <input type="file" accept="video/mp4,video/webm" onChange={handleFileChange} />
        </div>
      </Card>

      {videoUrl && (
        <Card style={{ position: "relative" }}>
          <h3 style={{ margin: "0 0 16px 0" }}>Interactive Timeline</h3>
          <video ref={videoRef} src={videoUrl} controls style={{ width: "100%", borderRadius: "8px", backgroundColor: "#000" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
             <button onClick={handleAddQuestionClick} style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600" }}>
               + Add Question at Current Time
             </button>
          </div>

          {questions.length > 0 && (
             <div style={{ marginTop: "24px" }}>
               <h4>Questions</h4>
               {questions.map((q, idx) => (
                 <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "8px" }}>
                   <div>
                      <strong>{Math.floor(q.timestamp)}s</strong> - {q.question_text} ({q.question_type})
                   </div>
                   <button onClick={() => handleRemoveQuestion(idx)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>Remove</button>
                 </div>
               ))}
             </div>
          )}

          {showQuestionBuilder && (
            <div style={{ marginTop: "24px", padding: "20px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <h4>Add Question at {Math.floor(newQuestionTime)}s</h4>
              
              <div style={{ marginBottom: "16px" }}>
                <Label>Question Type</Label>
                <Select value={newQuestionType} onChange={(e: any) => {
                  setNewQuestionType(e.target.value);
                  if (e.target.value === "True / False") {
                    setNewQuestionOptions([{text: "True", is_correct: true}, {text: "False", is_correct: false}]);
                  }
                }}>
                  <option value="MCQ">Multiple Choice</option>
                  <option value="True / False">True / False</option>
                </Select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <Label>Question Text</Label>
                <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none", minHeight: "80px" }} />
              </div>

              <Label>Options</Label>
              {newQuestionOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <input type="radio" checked={opt.is_correct} onChange={() => {
                    const opts = [...newQuestionOptions];
                    opts.forEach(o => o.is_correct = false);
                    opts[idx].is_correct = true;
                    setNewQuestionOptions(opts);
                  }} />
                  <Input value={opt.text} onChange={(e: any) => {
                    const opts = [...newQuestionOptions];
                    opts[idx].text = e.target.value;
                    setNewQuestionOptions(opts);
                  }} disabled={newQuestionType === "True / False"} />
                  {newQuestionType === "MCQ" && (
                    <button onClick={() => {
                      const opts = [...newQuestionOptions];
                      opts.splice(idx, 1);
                      setNewQuestionOptions(opts);
                    }} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>X</button>
                  )}
                </div>
              ))}
              {newQuestionType === "MCQ" && (
                <button onClick={() => setNewQuestionOptions([...newQuestionOptions, {text: "", is_correct: false}])} style={{ fontSize: "12px", padding: "4px 8px", cursor: "pointer" }}>+ Add Option</button>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button onClick={handleSaveQuestion} style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: "6px", border: "none", cursor: "pointer" }}>Save Question</button>
                <button onClick={() => setShowQuestionBuilder(false)} style={{ padding: "8px 16px", backgroundColor: "white", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: "12px 32px", borderRadius: "8px", border: "none", backgroundColor: "#10b981", color: "#fff", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
          {loading ? "Uploading..." : "Save Material & Video"}
        </button>
      </div>
    </div>
  );
};

export default CreateVideoMaterial;
