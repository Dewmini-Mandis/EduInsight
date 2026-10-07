import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import SuccessBanner from "../../components/SuccessBanner";

const Card = ({ children, style }: any) => (
  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", ...style }}>
    {children}
  </div>
);

const Label = ({ children }: any) => (
  <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" }}>{children}</div>
);

const Input = ({ ...props }: any) => (
  <input style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} {...props} />
);

const Select = ({ children, ...props }: any) => (
  <select style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b", backgroundColor: "#fff" }} {...props}>
    {children}
  </select>
);

const CreateMaterial = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<any>({});

  // Form State
  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState("TEXT");
  const [content, setContent] = useState("");

  // Metadata State
  const [termsList, setTermsList] = useState<any[]>([]);
  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  // Selection State
  const [termId, setTermId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [skillId, setSkillId] = useState("");

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } });
      if (res.ok) setTermsList(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!termId) { setLessonsList([]); setLessonId(""); return; }
    const fetchFilteredLessons = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/lessons/?term=${termId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setLessonsList(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) { console.error(err); }
    };
    fetchFilteredLessons();
  }, [termId]);

  useEffect(() => {
    if (!lessonId) { setTopicsList([]); setTopicId(""); return; }
    const fetchFilteredTopics = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/topics/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setTopicsList(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) { console.error(err); }
    };
    fetchFilteredTopics();
  }, [lessonId]);

  useEffect(() => {
    if (!topicId) { setSkillsList([]); setSkillId(""); return; }
    const fetchFilteredSkills = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/skills/?topic=${topicId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setSkillsList(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) { console.error(err); }
    };
    fetchFilteredSkills();
  }, [topicId]);

  const [estimatedTime, setEstimatedTime] = useState("5");
  const [timeError, setTimeError] = useState("");

  const validateTime = (val: string) => {
    if (!val || val.trim() === "") {
      return "Estimated completion time is required.";
    }
    const num = Number(val);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      return "Enter a valid completion time in minutes.";
    }
    return "";
  };

  const handleSubmit = async () => {
    const token = getToken();
    if (!token) return;

    const errors: any = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!termId) errors.termId = "Academic Term is required.";
    if (!lessonId) errors.lessonId = "Lesson is required.";
    if (!topicId) errors.topicId = "Topic is required.";
    if (!skillId) errors.skillId = "Skill is required.";
    
    if (materialType !== "VIDEO") {
      const tErr = validateTime(estimatedTime);
      if (tErr) {
        setTimeError(tErr);
        errors.estimatedTime = tErr;
      }
    } else {
      setTimeError("");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError("");

    const payload: any = {
      title,
      material_type: materialType,
      content,
      lesson: parseInt(lessonId),
      topic: topicId ? parseInt(topicId) : null,
      skill: skillId ? parseInt(skillId) : null,
    };

    if (materialType !== "VIDEO") {
      payload.estimated_completion_minutes = parseInt(estimatedTime);
    }

    try {
      const res = await fetch("/api/quizzes/materials/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to create material");
      }
      setSuccessMsg("Material created successfully.");
      setTimeout(() => {
        navigate("/teacher/quizzes");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "800px", margin: "0 auto" }}>
      <div>
        <button 
          onClick={() => navigate("/teacher/quizzes")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </button>
      </div>

      <h2 style={{ margin: 0, color: "#1e293b" }}>Upload Learning Material</h2>
      {successMsg && (
        <SuccessBanner 
          message={successMsg} 
          onClose={() => setSuccessMsg("")} 
        />
      )}
      {error && <div style={{ color: "#FF4054" }}>{error}</div>}

      <Card>
        <div>
          <Label>Title <span style={{ color: "#FF4054" }}>*</span></Label>
          <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Intro to Algebra Video" />
          {fieldErrors.title && <span style={{ color: "#FF4054", fontSize: "12px" }}>{fieldErrors.title}</span>}
        </div>

        <div>
          <Label>Material Type <span style={{ color: "#FF4054" }}>*</span></Label>
          <Select value={materialType} onChange={(e: any) => setMaterialType(e.target.value)}>
            <option value="VIDEO">Video Link (YouTube, Vimeo, etc.)</option>
            <option value="PDF">PDF URL</option>
            <option value="TEXT">Text Summary / Theory</option>
          </Select>
        </div>

        {materialType !== "VIDEO" && (
          <div>
            <Label>Estimated Completion Time <span style={{ color: "#FF4054" }}>*</span></Label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Input
                type="number"
                min="1"
                step="1"
                value={estimatedTime}
                onChange={(e: any) => {
                  setEstimatedTime(e.target.value);
                  if (timeError) setTimeError(validateTime(e.target.value));
                }}
                placeholder="5"
                style={{
                  width: "120px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: timeError ? "1px solid #FF4054" : "1px solid #e2e8f0",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
              <span style={{ fontSize: "13px", color: "#64748b" }}>Minutes</span>
            </div>
            {timeError && (
              <div style={{ color: "#FF4054", fontSize: "12px", marginTop: "4px", fontWeight: "500" }}>
                {timeError}
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Content (Text or URL) <span style={{ color: "#FF4054" }}>*</span></Label>
          {materialType === "TEXT" ? (
             <textarea 
               value={content} 
               onChange={(e) => setContent(e.target.value)}
               placeholder="Write the summary or theory here..."
               style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", minHeight: "150px" }}
             />
          ) : (
             <Input value={content} onChange={(e: any) => setContent(e.target.value)} placeholder="https://..." />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <Label>Academic Term <span className="required-marker">*</span></Label>
            <Select value={termId} onChange={(e: any) => { setTermId(e.target.value); setFieldErrors({...fieldErrors, termId: null}); }}>
              <option value="">Select Term</option>
              {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            {fieldErrors.termId && <span style={{ color: "red", fontSize: "12px" }}>{fieldErrors.termId}</span>}
          </div>
          <div>
            <Label>Lesson <span className="required-marker">*</span></Label>
            <Select value={lessonId} onChange={(e: any) => { setLessonId(e.target.value); setFieldErrors({...fieldErrors, lessonId: null}); }} disabled={!termId}>
              <option value="">Select Lesson</option>
              {lessonsList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
            {fieldErrors.lessonId && <span style={{ color: "red", fontSize: "12px" }}>{fieldErrors.lessonId}</span>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <Label>Topic <span className="required-marker">*</span></Label>
            <Select value={topicId} onChange={(e: any) => { setTopicId(e.target.value); setFieldErrors({...fieldErrors, topicId: null}); }} disabled={!lessonId}>
              <option value="">Select Topic</option>
              {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            {fieldErrors.topicId && <span style={{ color: "red", fontSize: "12px" }}>{fieldErrors.topicId}</span>}
          </div>
          <div>
            <Label>Skill <span className="required-marker">*</span></Label>
            <Select value={skillId} onChange={(e: any) => { setSkillId(e.target.value); setFieldErrors({...fieldErrors, skillId: null}); }} disabled={!topicId}>
              <option value="">Select Skill</option>
              {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            {fieldErrors.skillId && <span style={{ color: "red", fontSize: "12px" }}>{fieldErrors.skillId}</span>}
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
            {loading ? "Saving..." : "Save Material"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default CreateMaterial;
