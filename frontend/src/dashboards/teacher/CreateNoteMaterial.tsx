import React, { useEffect, useState } from "react";
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

const CreateNoteMaterial = () => {
  const navigate = useNavigate();
  const { materialId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [termsList, setTermsList] = useState<any[]>([]);
  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  const [termId, setTermId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [skillId, setSkillId] = useState("");

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
        setContent(data.content || "");
        if (data.lesson) {
          setLessonId(data.lesson.toString());
          const lessonRes = await fetch(`/api/quizzes/lessons/${data.lesson}/`, { headers: { Authorization: `Token ${getToken()}` } });
          if (lessonRes.ok) {
            const lessonData = await lessonRes.json();
            if (lessonData.term) setTermId(lessonData.term.toString());
          }
        }
        if (data.topic) setTopicId(data.topic.toString());
        if (data.skill) setSkillId(data.skill.toString());
        if (data.attachments) setExistingAttachments(data.attachments);
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
    const files = Array.from(e.target.files) as File[];
    setAttachments([...attachments, ...files]);
  };

  const handleRemoveAttachment = (idx: number) => {
    const atts = [...attachments];
    atts.splice(idx, 1);
    setAttachments(atts);
  };

  const handleRemoveExistingAttachment = async (id: number, idx: number) => {
    if (window.confirm("Are you sure you want to remove this attachment?")) {
      try {
        const res = await fetch(`/api/quizzes/material-attachments/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${getToken()}` }
        });
        if (res.ok) {
          const atts = [...existingAttachments];
          atts.splice(idx, 1);
          setExistingAttachments(atts);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !lessonId) {
      setError("Title and Lesson are required.");
      return;
    }
    
    if (attachments.length === 0 && existingAttachments.length === 0) {
      setError("At least one attachment is required for note materials.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("material_type", "TEXT");
      if (content) formData.append("content", content);
      formData.append("lesson", lessonId);
      if (topicId) formData.append("topic", topicId);
      if (skillId) formData.append("skill", skillId);

      for (let file of attachments) {
        formData.append("attachments", file);
      }

      const url = materialId ? `/api/quizzes/materials/${materialId}/` : "/api/quizzes/materials/";
      const method = materialId ? "PATCH" : "POST";

      const matRes = await fetch(url, {
        method: method,
        headers: { Authorization: `Token ${getToken()}` },
        body: formData
      });

      if (!matRes.ok) {
        const errorData = await matRes.json();
        throw new Error(errorData.detail || "Failed to save note material.");
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

      <h2>{materialId ? "Edit Learning Note" : "Create Learning Note"}</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <Card>
        <div>
          <Label>Title *</Label>
          <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Chapter 1 Summary" />
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
          <Label>Note Content (Optional)</Label>
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="Write the summary, notes, or theory here..."
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", outline: "none", minHeight: "250px", fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        <div>
          <Label>Attachments (PDF / Images) *</Label>
          <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} />
          
          {(existingAttachments.length > 0 || attachments.length > 0) && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {existingAttachments.map((att, idx) => (
                <div key={`exist-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "13px", color: "#334155" }}>{att.file.split("/").pop()} (Existing)</span>
                  <button onClick={() => handleRemoveExistingAttachment(att.id, idx)} style={{ color: "red", border: "none", background: "none", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                </div>
              ))}
              {attachments.map((file, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "13px", color: "#334155" }}>{file.name}</span>
                  <button onClick={() => handleRemoveAttachment(idx)} style={{ color: "red", border: "none", background: "none", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: "12px 32px", borderRadius: "8px", border: "none", backgroundColor: "#10b981", color: "#fff", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
          {loading ? "Saving..." : "Save Note Material"}
        </button>
      </div>
    </div>
  );
};

export default CreateNoteMaterial;
