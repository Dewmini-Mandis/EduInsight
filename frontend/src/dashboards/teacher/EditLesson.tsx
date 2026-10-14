import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { queryClient } from "../../api/queryClient";
import { getToken } from "../../auth/authUtils";
import { BookOpen, ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import SuccessBanner from "../../components/SuccessBanner";
import "../../styles/teacher.css";

interface SkillItem {
  id?: number;
  tempId?: string;
  name: string;
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
};

const EditLesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isSystemAdmin = location.pathname.startsWith("/system-admin");
  const basePath = isSystemAdmin ? "/system-admin/lessons" : "/teacher/lessons";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState("");
  const [terms, setTerms] = useState<any[]>([]);

  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skillErrors, setSkillErrors] = useState<Record<number, string>>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isSystemAdmin) {
      navigate(`/teacher/lessons/${lessonId}/skills`, { replace: true });
    }
  }, [isSystemAdmin, lessonId, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      const token = getToken();
      try {
        const [termsRes, lessonRes, skillsRes] = await Promise.all([
          fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
          fetch(`/api/quizzes/lessons/${lessonId}/`, { headers: { Authorization: `Token ${token}` } }),
          fetch(`/api/quizzes/skills/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } })
        ]);

        if (termsRes.ok) {
          const termsData = await termsRes.json();
          setTerms(Array.isArray(termsData) ? termsData : (termsData.results || []));
        }

        if (lessonRes.ok) {
          const lessonData = await lessonRes.json();
          setTitle(lessonData.title || "");
          setDescription(lessonData.description || "");
          setTerm(lessonData.term ? String(lessonData.term) : "");
        } else {
          setError("Failed to load lesson details.");
        }

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          const list = Array.isArray(skillsData) ? skillsData : (skillsData.results || []);
          setSkills(list.map((s: any) => ({ id: s.id, name: s.name })));
        }
      } catch (err) {
        console.error("Error loading lesson data:", err);
        setError("Error loading lesson data.");
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchData();
    }
  }, [lessonId]);

  const validateLessonField = (name: string, value: string): string => {
    switch (name) {
      case "title":
        if (!value.trim()) return "Lesson title is required.";
        return "";
      case "term":
        if (!value) return "Term is required.";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val = "";
    if (field === "title") val = title;
    else if (field === "term") val = term;
    const err = validateLessonField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleAddSkillRow = () => {
    const val = newSkillName.trim();
    if (val) {
      setSkills((prev) => [
        ...prev,
        { tempId: `temp_${Date.now()}_${Math.random()}`, name: val }
      ]);
      setNewSkillName("");
    } else {
      setSkills((prev) => [
        ...prev,
        { tempId: `temp_${Date.now()}_${Math.random()}`, name: "" }
      ]);
    }
  };

  const handleSkillNameChange = (index: number, val: string) => {
    setSkills((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: val };
      return copy;
    });

    if (skillErrors[index]) {
      setSkillErrors((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }
  };

  const handleRemoveSkillRow = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
    setSkillErrors((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const titleErr = validateLessonField("title", title);
    const termErr = validateLessonField("term", term);
    const errors = { title: titleErr, term: termErr };
    setFieldErrors(errors);
    setTouched({ title: true, term: true });

    if (titleErr) {
      titleRef.current?.focus();
      return;
    }
    if (termErr) {
      termRef.current?.focus();
      return;
    }

    // Skill validations
    const newSkillErrors: Record<number, string> = {};
    const seenNames = new Set<string>();

    skills.forEach((s, i) => {
      const trimmed = s.name.trim();
      if (!trimmed) {
        newSkillErrors[i] = "Skill name is required.";
        return;
      }
      const lower = trimmed.toLowerCase();
      if (seenNames.has(lower)) {
        newSkillErrors[i] = "Duplicate skill name within this lesson.";
      } else {
        seenNames.add(lower);
      }
    });

    if (Object.keys(newSkillErrors).length > 0) {
      setSkillErrors(newSkillErrors);
      return;
    }

    setSubmitting(true);
    const token = getToken();

    const payload = {
      title: title.trim(),
      description: description.trim(),
      term: parseInt(term),
      skills: skills.map((s) => (s.id ? { id: s.id, name: s.name.trim() } : { name: s.name.trim() }))
    };

    try {
      const res = await fetch(`/api/quizzes/lessons/${lessonId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.detail) {
          throw new Error(errData.detail);
        }
        if (typeof errData.skills === "string") {
          throw new Error(errData.skills);
        }
        if (Array.isArray(errData.skills)) {
          throw new Error(errData.skills.join(" "));
        }
        throw new Error(errData.message || "Failed to update lesson.");
      }

      // Invalidate caches to update UI across app
      queryClient.invalidateQueries(["teacher", "lessons"]);
      queryClient.invalidateQueries(["student", "lessons"]);
      queryClient.invalidateQueries(["quizzes"]);
      queryClient.invalidateQueries(["skills"]);

      setSuccessMsg("Lesson and skills updated successfully.");
      setTimeout(() => {
        navigate(basePath);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save lesson and skills.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#5D78A3" }}>
        Loading lesson and skills data...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Header & Back button */}
      <div style={{ marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => navigate(basePath)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "none",
            color: "#126BFF",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "16px",
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          Back to Lessons
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#EAF3FF",
            color: "#126BFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0B1F3A" }}>
              Edit Lesson
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              Update lesson information and manage its skills.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <SuccessBanner 
          message={successMsg} 
          onClose={() => setSuccessMsg("")} 
          style={{ marginBottom: "20px" }} 
        />
      )}

      {error && (
        <div className="teacher-badge danger" style={{ width: "100%", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box", borderRadius: "9px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Lesson Details Card */}
        <div className="teacher-card" style={{ marginBottom: "24px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "700", color: "#0B1F3A" }}>
            Lesson Details
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Title */}
            <div className="teacher-form-group" style={{ margin: 0 }}>
              <label className="teacher-form-label" htmlFor="lesson-title">
                Lesson Title <span style={{ color: "#FF4054" }}>*</span>
              </label>
              <input
                id="lesson-title"
                ref={titleRef}
                type="text"
                aria-required="true"
                aria-invalid={Boolean(touched.title && fieldErrors.title)}
                className={`teacher-form-input ${touched.title && fieldErrors.title ? "is-invalid" : ""}`}
                placeholder="e.g., Perimeter and Area of 2D Shapes"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (touched.title) setFieldErrors((prev) => ({ ...prev, title: validateLessonField("title", e.target.value) }));
                }}
                onBlur={() => handleBlur("title")}
              />
              {touched.title && fieldErrors.title && (
                <div style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <AlertCircle size={14} />
                  <span>{fieldErrors.title}</span>
                </div>
              )}
            </div>

            {/* Academic Term */}
            <div className="teacher-form-group" style={{ margin: 0 }}>
              <label className="teacher-form-label" htmlFor="lesson-term">
                Academic Term <span style={{ color: "#FF4054" }}>*</span>
              </label>
              <select
                id="lesson-term"
                ref={termRef}
                aria-required="true"
                aria-invalid={Boolean(touched.term && fieldErrors.term)}
                className={`teacher-dropdown-filter ${touched.term && fieldErrors.term ? "is-invalid" : ""}`}
                style={{ width: "100%", height: "46px" }}
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  if (touched.term) setFieldErrors((prev) => ({ ...prev, term: validateLessonField("term", e.target.value) }));
                }}
                onBlur={() => handleBlur("term")}
              >
                <option value="">Select a term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {touched.term && fieldErrors.term && (
                <div style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <AlertCircle size={14} />
                  <span>{fieldErrors.term}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="teacher-form-group" style={{ margin: 0 }}>
            <label className="teacher-form-label" htmlFor="lesson-description">
              Lesson Description
            </label>
            <textarea
              id="lesson-description"
              className="teacher-form-input"
              style={{ minHeight: "100px", fontFamily: "inherit" }}
              placeholder="Provide detail on concepts covered under this syllabus lesson..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Skills Section Card */}
        <div className="teacher-card" style={{ marginBottom: "32px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0B1F3A" }}>
                Skills
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>
                Define key competencies and skills associated with this lesson.
              </p>
            </div>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#126BFF", background: "#EAF3FF", padding: "4px 12px", borderRadius: "999px" }}>
              {skills.length} {skills.length === 1 ? "Skill" : "Skills"}
            </span>
          </div>

          {/* Skill rows */}
          {skills.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#5D78A3", background: "#F7FAFE", borderRadius: "9px", border: "1px dashed #BFD4F5", marginBottom: "16px" }}>
              No skills added to this lesson yet. Click "+ Add Skill" below to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {skills.map((skill, index) => (
                <div key={skill.id || skill.tempId || index}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%"
                    }}
                  >
                    <div style={{ flex: isMobile ? "1 1 100%" : "1 1 75%" }}>
                      <input
                        type="text"
                        className={`teacher-form-input ${skillErrors[index] ? "is-invalid" : ""}`}
                        placeholder={`Skill ${index + 1} name (e.g., Calculate Perimeter)`}
                        value={skill.name}
                        onChange={(e) => handleSkillNameChange(index, e.target.value)}
                        style={{ width: "100%", height: "44px" }}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Remove skill"
                      title="Remove skill"
                      onClick={() => handleRemoveSkillRow(index)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "42px",
                        height: "42px",
                        borderRadius: "9px",
                        backgroundColor: "#FFF5F5",
                        border: "1px solid #FFB8BE",
                        color: "#FF3347",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 150ms ease"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {skillErrors[index] && (
                    <div style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <AlertCircle size={14} />
                      <span>{skillErrors[index]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Widened Add Skill Input Bar */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E4ECF6" }}>
            <label className="teacher-form-label" htmlFor="new-skill-input" style={{ marginBottom: "8px", display: "block" }}>
              Add New Skill
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
                alignItems: isMobile ? "stretch" : "center",
                width: "100%"
              }}
            >
              <div style={{ flex: isMobile ? "1 1 100%" : "1 1 75%" }}>
                <input
                  id="new-skill-input"
                  type="text"
                  className="teacher-form-input"
                  placeholder="Enter new skill name (e.g., Calculate Perimeter and Area)"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkillRow();
                    }
                  }}
                  style={{ width: "100%", height: "42px" }}
                />
              </div>
              <button
                type="button"
                onClick={handleAddSkillRow}
                style={{
                  flex: isMobile ? "1 1 100%" : "0 0 auto",
                  minWidth: isMobile ? "100%" : "140px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  height: "42px",
                  padding: "0 20px",
                  borderRadius: "9px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#FFFFFF",
                  background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)",
                  transition: "all 150ms ease"
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Skill
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            className="teacher-btn-secondary"
            onClick={() => navigate(basePath)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="teacher-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditLesson;
