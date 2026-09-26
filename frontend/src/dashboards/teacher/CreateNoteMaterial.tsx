import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { FileText, Calendar, BookOpen, Layers, Target, Save, HelpCircle, ArrowUp, ArrowDown } from "lucide-react";

import LearningNoteHeader from "../../components/materials/LearningNoteHeader";
import RichTextEditor from "../../components/materials/RichTextEditor";
import FileUploader from "../../components/materials/FileUploader";

const MainCard = ({ children, style }: any) => (
  <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)", padding: "22px", display: "flex", flexDirection: "column", gap: "20px", ...style }}>
    {children}
  </div>
);

const Label = ({ children }: any) => <div style={{ fontSize: "13px", fontWeight: "600", color: "#234A7A", marginBottom: "7px" }}>{children}</div>;

const InputWrapper = ({ icon: Icon, children }: any) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
    <div style={{ position: "absolute", left: "14px", color: "#126BFF", pointerEvents: "none", display: "flex" }}>
      <Icon size={18} strokeWidth={2} />
    </div>
    {children}
  </div>
);

const Input = ({ ...props }: any) => (
  <input style={{ width: "100%", height: "46px", padding: "0 14px 0 42px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none", color: "#0B1F3A", transition: "all 0.2s" }} onFocus={(e:any) => {e.target.style.borderColor="#126BFF"; e.target.style.boxShadow="0 0 0 3px rgba(18,107,255,0.10)"}} onBlur={(e:any) => {e.target.style.borderColor="#DCE6F3"; e.target.style.boxShadow="none"}} {...props} />
);

const Select = ({ children, ...props }: any) => (
  <select style={{ width: "100%", height: "46px", padding: "0 14px 0 42px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none", color: "#0B1F3A", backgroundColor: "#fff", appearance: "none", transition: "all 0.2s" }} onFocus={(e:any) => {e.target.style.borderColor="#126BFF"; e.target.style.boxShadow="0 0 0 3px rgba(18,107,255,0.10)"}} onBlur={(e:any) => {e.target.style.borderColor="#DCE6F3"; e.target.style.boxShadow="none"}} {...props}>{children}</select>
);

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
  const [quizzesList, setQuizzesList] = useState<any[]>([]);

  const [termId, setTermId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [quizId, setQuizId] = useState("");

  const [sectionOrder, setSectionOrder] = useState<string[]>(["NOTE", "ATTACHMENTS", "VIDEO"]);

  useEffect(() => { fetchTerms(); fetchQuizzes(); }, []);
  
  const fetchTerms = async () => {
    const res = await fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${getToken()}` } });
    if (res.ok) setTermsList(await res.json());
  };

  const fetchQuizzes = async () => {
    const res = await fetch("/api/quizzes/", { headers: { Authorization: `Token ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setQuizzesList(Array.isArray(data) ? data : data.results || []);
    }
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
        if (data.quiz) setQuizId(data.quiz.toString());
        if (data.section_order && Array.isArray(data.section_order) && data.section_order.length > 0) {
          setSectionOrder(data.section_order);
        }
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
      .then(r => r.json()).then(data => setLessonsList(Array.isArray(data) ? data : data.results || []));
  }, [termId]);

  useEffect(() => {
    if (!lessonId) { setTopicsList([]); setTopicId(""); return; }
    fetch(`/api/quizzes/topics/?lesson=${lessonId}`, { headers: { Authorization: `Token ${getToken()}` } })
      .then(r => r.json()).then(data => setTopicsList(Array.isArray(data) ? data : data.results || []));
  }, [lessonId]);

  useEffect(() => {
    if (!topicId) { setSkillsList([]); setSkillId(""); return; }
    fetch(`/api/quizzes/skills/?topic=${topicId}`, { headers: { Authorization: `Token ${getToken()}` } })
      .then(r => r.json()).then(data => setSkillsList(Array.isArray(data) ? data : data.results || []));
  }, [topicId]);

  const handleAddFiles = (files: File[]) => {
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

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setSectionOrder(newOrder);
  };

  const moveSectionDown = (index: number) => {
    if (index === sectionOrder.length - 1) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setSectionOrder(newOrder);
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
      if (quizId) formData.append("quiz", quizId);
      formData.append("section_order", JSON.stringify(sectionOrder));

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
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "1240px", margin: "0 auto", padding: "24px 32px 32px 32px" }}>
      
      <LearningNoteHeader 
        onBack={() => navigate("/teacher/materials")} 
        title={materialId ? "Edit Learning Note" : "Create Learning Note"}
        subtitle="Create rich text materials with attachments."
        helperText="Add a summary, select the relevant term, lesson, topic, skill, and associated quiz, and arrange section order."
        icon={FileText}
      />

      {error && <div style={{ color: "#FF4054", padding: "12px", backgroundColor: "#FDEDED", borderRadius: "8px", fontSize: "14px", fontWeight: "500", border: "1px solid #FADCDC", marginBottom: "16px" }}>{error}</div>}

      <MainCard>
        <div>
          <Label>Title <span style={{ color: "#126BFF" }}>*</span></Label>
          <InputWrapper icon={FileText}>
            <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Chapter 1 Summary" />
          </InputWrapper>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <Label>Term <span style={{ color: "#126BFF" }}>*</span></Label>
            <InputWrapper icon={Calendar}>
              <Select value={termId} onChange={(e: any) => setTermId(e.target.value)}>
                <option value="">Select Term</option>
                {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </InputWrapper>
          </div>
          <div>
            <Label>Lesson <span style={{ color: "#126BFF" }}>*</span></Label>
            <InputWrapper icon={BookOpen}>
              <Select value={lessonId} onChange={(e: any) => setLessonId(e.target.value)} disabled={!termId}>
                <option value="">Select Lesson</option>
                {lessonsList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </InputWrapper>
          </div>
          <div>
            <Label>Topic</Label>
            <InputWrapper icon={Layers}>
              <Select value={topicId} onChange={(e: any) => setTopicId(e.target.value)} disabled={!lessonId}>
                <option value="">Select Topic</option>
                {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </InputWrapper>
          </div>
          <div>
            <Label>Skill</Label>
            <InputWrapper icon={Target}>
              <Select value={skillId} onChange={(e: any) => setSkillId(e.target.value)} disabled={!topicId}>
                <option value="">Select Skill</option>
                {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </InputWrapper>
          </div>
        </div>

        <div>
          <Label>Associated Quiz (Optional - Redirects failed students to this material)</Label>
          <InputWrapper icon={HelpCircle}>
            <Select value={quizId} onChange={(e: any) => setQuizId(e.target.value)}>
              <option value="">-- None (No Direct Quiz Link) --</option>
              {quizzesList.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </Select>
          </InputWrapper>
        </div>

        <div>
          <Label>Section Display Order</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sectionOrder.map((section, idx) => (
              <div key={section} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#F8FBFF", border: "1px solid #DCE6F3", borderRadius: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>
                  {idx + 1}. {section === "NOTE" ? "Note Content" : section === "ATTACHMENTS" ? "Attachments & Documents" : "Video Material"}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button type="button" onClick={() => moveSectionUp(idx)} disabled={idx === 0} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #DCE6F3", backgroundColor: idx === 0 ? "#EFEFEF" : "#FFFFFF", cursor: idx === 0 ? "default" : "pointer" }}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveSectionDown(idx)} disabled={idx === sectionOrder.length - 1} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #DCE6F3", backgroundColor: idx === sectionOrder.length - 1 ? "#EFEFEF" : "#FFFFFF", cursor: idx === sectionOrder.length - 1 ? "default" : "pointer" }}>
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Note Content (Optional)</Label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div>
          <Label>Attachments (PDF / Images) <span style={{ color: "#126BFF" }}>*</span></Label>
          <FileUploader 
            existingAttachments={existingAttachments}
            newAttachments={attachments}
            onAddFiles={handleAddFiles}
            onRemoveExisting={handleRemoveExistingAttachment}
            onRemoveNew={handleRemoveAttachment}
          />
        </div>
      </MainCard>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
        <button onClick={() => navigate("/teacher/materials")} style={{ height: "42px", padding: "0 18px", borderRadius: "8px", border: "1px solid #DCE6F3", background: "#F7FAFE", color: "#3D5E8A", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px", height: "42px", padding: "0 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)", transition: "transform 150ms ease" }} onMouseEnter={(e:any) => e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={(e:any) => e.currentTarget.style.transform="none"}>
          <Save size={16} />
          {loading ? "Saving..." : "Save Learning Note"}
        </button>
      </div>
    </div>
  );
};

export default CreateNoteMaterial;
