import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { UploadCloud, Trash2, Calendar, BookOpen, Layers, Target, Save, FileText, Video, HelpCircle, ArrowUp, ArrowDown } from "lucide-react";

import LearningNoteHeader from "../../components/materials/LearningNoteHeader";
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
  const [successMsg, setSuccessMsg] = useState("");

  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  const [searchParams] = useSearchParams();
  const queryLessonId = searchParams.get("lessonId") || "";
  const querySkillId = searchParams.get("skillId") || "";

  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  const [lessonId, setLessonId] = useState(queryLessonId);
  const [skillId, setSkillId] = useState(querySkillId);

  const [selectedLessonObj, setSelectedLessonObj] = useState<any>(null);
  const [selectedSkillObj, setSelectedSkillObj] = useState<any>(null);

  const [sectionOrder, setSectionOrder] = useState<string[]>(["NOTE", "ATTACHMENTS", "VIDEO"]);

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

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setLessonsList(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error("Failed to load lessons:", e);
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
        setVideoUrl(data.file || "");
        if (data.section_order && Array.isArray(data.section_order) && data.section_order.length > 0) {
          setSectionOrder(data.section_order);
        }
        if (data.lesson) {
          setLessonId(data.lesson.toString());
        }
        if (data.skill) {
          setSkillId(data.skill.toString());
        }
        if (data.video_questions) setQuestions(data.video_questions);
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
    if (!title || (!videoFile && !materialId) || !lessonId || !skillId) {
      setError("Title, Video File, Lesson, and Skill are required.");
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
      formData.append("skill", skillId);
      formData.append("section_order", JSON.stringify(sectionOrder));

      const url = materialId ? `/api/quizzes/materials/${materialId}/` : "/api/quizzes/materials/";
      const method = materialId ? "PATCH" : "POST";

      const matRes = await fetch(url, {
        method: method,
        headers: { Authorization: `Token ${getToken()}` },
        body: formData
      });

      if (!matRes.ok) throw new Error("Failed to save video material.");
      const matData = await matRes.json();

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

      setSuccessMsg(materialId ? "Material updated successfully." : "Video uploaded successfully.");
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
        title={materialId ? "Edit Interactive Video" : "Upload Interactive Video"}
        subtitle="Add a video and configure timeline questions."
        helperText="Add a video under the selected Lesson and Skill, and build an interactive timeline."
        icon={Video}
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
            <Label>Skill <span className="required-marker">*</span></Label>
            <InputWrapper icon={Target}>
              <Select value={skillId} onChange={(e: any) => setSkillId(e.target.value)} disabled={!lessonId}>
                <option value="">Select Skill</option>
                {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </InputWrapper>
          </div>
        </div>

        <div>
          <Label>Title <span className="required-marker">*</span></Label>
          <InputWrapper icon={FileText}>
            <Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="E.g., Intro to Fractions Video" />
          </InputWrapper>
        </div>

        <div>
          <Label>Video File {materialId ? "(Leave empty to keep existing)" : <span className="required-marker">*</span>}</Label>
          <FileUploader
            accept="video/mp4,video/webm"
            multiple={false}
            helpText="Supported formats: MP4, WebM (Max 50MB)"
            existingAttachments={videoUrl && !videoFile ? [{ id: 'video', file: videoUrl }] : []}
            newAttachments={videoFile ? [videoFile] : []}
            onAddFiles={(files) => {
              if (files.length > 0) {
                setVideoFile(files[0]);
                setVideoUrl(URL.createObjectURL(files[0]));
              }
            }}
            onRemoveExisting={() => setVideoUrl("")}
            onRemoveNew={() => { setVideoFile(null); setVideoUrl(""); }}
          />
        </div>

      {videoUrl && (
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#0B1F3A" }}>Interactive Timeline</h3>
          <video ref={videoRef} src={videoUrl} controls style={{ width: "100%", borderRadius: "12px", backgroundColor: "#000", border: "1px solid #E4ECF6" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
             <button onClick={handleAddQuestionClick} style={{ padding: "10px 20px", backgroundColor: "#EEF4FB", color: "#126BFF", border: "1px solid #C8D8EB", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
               + Add Question at Current Time
             </button>
          </div>

          {questions.length > 0 && (
             <div style={{ marginTop: "24px" }}>
               <h4 style={{ color: "#0B1F3A", marginBottom: "12px" }}>Questions</h4>
               {questions.map((q, idx) => (
                 <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#F7FAFE", border: "1px solid #E4ECF6", borderRadius: "12px", marginBottom: "8px" }}>
                   <div style={{ fontSize: "14px", color: "#3D5E8A" }}>
                      <strong style={{ color: "#0B1F3A", marginRight: "8px" }}>{Math.floor(q.timestamp)}s</strong>
                      {q.question_text} <span style={{ fontSize: "12px", color: "#5D78A3", backgroundColor: "#EAF3FF", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px" }}>{q.question_type}</span>
                   </div>
                   <button onClick={() => handleRemoveQuestion(idx)} style={{ color: "#FF4054", border: "none", background: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }} title="Remove Question"><Trash2 size={16}/></button>
                 </div>
               ))}
             </div>
          )}

          {showQuestionBuilder && (
            <div style={{ marginTop: "24px", padding: "24px", border: "1px solid #DCE6F3", borderRadius: "12px", backgroundColor: "#F7FAFE" }}>
              <h4 style={{ color: "#0B1F3A", margin: "0 0 16px 0" }}>Add Question at {Math.floor(newQuestionTime)}s</h4>
              
              <div style={{ marginBottom: "16px" }}>
                <Label>Question Type</Label>
                <div style={{ position: "relative" }}>
                  <select value={newQuestionType} onChange={(e: any) => {
                    setNewQuestionType(e.target.value);
                    if (e.target.value === "True / False") {
                      setNewQuestionOptions([{text: "True", is_correct: true}, {text: "False", is_correct: false}]);
                    }
                  }} style={{ width: "100%", height: "46px", padding: "0 14px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none", color: "#0B1F3A", backgroundColor: "#fff" }}>
                    <option value="MCQ">Multiple Choice</option>
                    <option value="True / False">True / False</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <Label>Question Text</Label>
                <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "9px", border: "1px solid #DCE6F3", outline: "none", color: "#0B1F3A", minHeight: "80px", fontFamily: "inherit", fontSize: "14px", resize: "vertical", transition: "border-color 0.2s" }} onFocus={(e:any) => e.target.style.borderColor="#126BFF"} onBlur={(e:any) => e.target.style.borderColor="#DCE6F3"} />
              </div>

              <Label>Options</Label>
              {newQuestionOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "center" }}>
                  <input type="radio" checked={opt.is_correct} onChange={() => {
                    const opts = [...newQuestionOptions];
                    opts.forEach(o => o.is_correct = false);
                    opts[idx].is_correct = true;
                    setNewQuestionOptions(opts);
                  }} style={{ width: "18px", height: "18px", accentColor: "#126BFF" }} />
                  <input value={opt.text} onChange={(e: any) => {
                    const opts = [...newQuestionOptions];
                    opts[idx].text = e.target.value;
                    setNewQuestionOptions(opts);
                  }} disabled={newQuestionType === "True / False"} style={{ flex: 1, height: "42px", padding: "0 14px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none", color: "#0B1F3A" }} />
                  {newQuestionType === "MCQ" && (
                    <button onClick={() => {
                      const opts = [...newQuestionOptions];
                      opts.splice(idx, 1);
                      setNewQuestionOptions(opts);
                    }} style={{ color: "#FF4054", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><Trash2 size={16}/></button>
                  )}
                </div>
              ))}
              {newQuestionType === "MCQ" && (
                <button onClick={() => setNewQuestionOptions([...newQuestionOptions, {text: "", is_correct: false}])} style={{ fontSize: "13px", padding: "8px 14px", cursor: "pointer", backgroundColor: "#EEF4FB", border: "1px solid #C8D8EB", color: "#3D5E8A", borderRadius: "6px", fontWeight: "600", marginTop: "8px" }}>+ Add Option</button>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button onClick={handleSaveQuestion} style={{ padding: "0 20px", height: "42px", backgroundColor: "#126BFF", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Save Question</button>
                <button onClick={() => setShowQuestionBuilder(false)} style={{ padding: "0 20px", height: "42px", backgroundColor: "white", color: "#5D78A3", border: "1px solid #DCE6F3", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      </MainCard>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
        <button onClick={() => navigate("/teacher/materials")} style={{ height: "42px", padding: "0 18px", borderRadius: "8px", border: "1px solid #DCE6F3", background: "#F7FAFE", color: "#3D5E8A", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px", height: "42px", padding: "0 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)", transition: "transform 150ms ease" }} onMouseEnter={(e:any) => e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={(e:any) => e.currentTarget.style.transform="none"}>
          <Save size={16} />
          {loading ? "Uploading..." : "Save Interactive Video"}
        </button>
      </div>
    </div>
  );
};

export default CreateVideoMaterial;
