import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { FileText, BookOpen, Target, Save, ArrowUp, ArrowDown } from "lucide-react";

import LearningNoteHeader from "../../components/materials/LearningNoteHeader";
import RichTextEditor from "../../components/materials/RichTextEditor";
import FileUploader from "../../components/materials/FileUploader";
import SuccessBanner from "../../components/SuccessBanner";

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
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  const [lessonId, setLessonId] = useState(searchParams.get("lessonId") || "");
  const [skillId, setSkillId] = useState(searchParams.get("skillId") || "");
  const [selectedLessonObj, setSelectedLessonObj] = useState<any>(null);
  const [selectedSkillObj, setSelectedSkillObj] = useState<any>(null);

  const [sectionOrder, setSectionOrder] = useState<string[]>(["NOTE", "ATTACHMENTS", "VIDEO"]);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    const res = await fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setLessonsList(list);
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
        if (data.section_order && Array.isArray(data.section_order) && data.section_order.length > 0) {
          setSectionOrder(data.section_order);
        }
        if (data.lesson) {
          setLessonId(data.lesson.toString());
        }
        if (data.skill) {
          setSkillId(data.skill.toString());
        }
        if (data.attachments) setExistingAttachments(data.attachments);
      }
    } catch (e) {
      console.error("Failed to load material:", e);
    }
  };

  useEffect(() => {
    if (!lessonId) {
      setSkillsList([]);
      setSkillId("");
      setSelectedLessonObj(null);
      return;
    }

    const match = lessonsList.find((l) => String(l.id) === String(lessonId));
    if (match) setSelectedLessonObj(match);

    fetch(`/api/quizzes/skills/?lesson=${lessonId}&active_only=true`, { headers: { Authorization: `Token ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => {
        const skillsData = Array.isArray(data) ? data : data.results || [];
        setSkillsList(skillsData);
        if (skillId && !skillsData.some((s: any) => String(s.id) === String(skillId))) {
          setSkillId("");
        }
      });
  }, [lessonId, lessonsList]);

  useEffect(() => {
    if (skillId && skillsList.length > 0) {
      const match = skillsList.find((s) => String(s.id) === String(skillId));
      if (match) setSelectedSkillObj(match);
    } else {
      setSelectedSkillObj(null);
    }
  }, [skillId, skillsList]);

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
    if (!title || !lessonId || !skillId) {
      setError("Title, Lesson, and Skill are required.");
      return;
    }
    
    if (attachments.length === 0 && existingAttachments.length === 0 && !content) {
      setError("Content or at least one attachment is required for note materials.");
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
      formData.append("skill", skillId);
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

      setSuccessMsg(materialId ? "Material updated successfully." : "Learning note created successfully.");
      setTimeout(() => {
        navigate(`/teacher/materials?lessonId=${lessonId}&skillId=${skillId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "1240px", margin: "0 auto", padding: "24px 32px 32px 32px" }}>
      
      <LearningNoteHeader 
        onBack={() => navigate(`/teacher/materials${lessonId ? `?lessonId=${lessonId}&skillId=${skillId}` : ''}`)} 
        title={materialId ? "Edit Learning Note" : "Create Learning Note"}
        subtitle="Create rich text materials with attachments."
        helperText="Create rich text note materials under the selected Skill."
        icon={FileText}
      />

      {successMsg && (
        <SuccessBanner 
          message={successMsg} 
          onClose={() => setSuccessMsg("")} 
          style={{ marginTop: "16px", marginBottom: "8px" }} 
        />
      )}

      {error && <div style={{ color: "#FF4054", padding: "12px", backgroundColor: "#FDEDED", borderRadius: "8px", fontSize: "14px", fontWeight: "500", border: "1px solid #FADCDC", marginBottom: "16px" }}>{error}</div>}

      <MainCard>
        {selectedLessonObj || selectedSkillObj ? (
          <div style={{ backgroundColor: "#F0F6FF", border: "1px solid #BAE0FF", borderRadius: "10px", padding: "14px 18px", display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="#126BFF" />
              <span style={{ fontSize: "13px", color: "#5D78A3" }}>Lesson:</span>
              <strong style={{ fontSize: "14px", color: "#0B1F3A" }}>{selectedLessonObj ? selectedLessonObj.title : `Lesson #${lessonId}`}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} color="#126BFF" />
              <span style={{ fontSize: "13px", color: "#5D78A3" }}>Skill:</span>
              <strong style={{ fontSize: "14px", color: "#0B1F3A" }}>{selectedSkillObj ? selectedSkillObj.name : `Skill #${skillId}`}</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <Label>Lesson <span className="required-marker">*</span></Label>
              <InputWrapper icon={BookOpen}>
                <Select value={lessonId} onChange={(e: any) => setLessonId(e.target.value)}>
                  <option value="">Select Lesson</option>
                  {lessonsList.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </Select>
              </InputWrapper>
            </div>
            <div>
              <Label>Skill</Label>
              <InputWrapper icon={Target}>
                <Select value={skillId} onChange={(e: any) => setSkillId(e.target.value)} disabled={!lessonId}>
                  <option value="">Select Skill</option>
                  {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </InputWrapper>
            </div>
          </div>
        )}

        <div>
          <Label>Title <span className="required-marker">*</span></Label>
          <InputWrapper icon={FileText}>
            <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Chapter 1 Summary" />
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
          <Label>Attachments (PDF / Images) <span className="required-marker">*</span></Label>
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
