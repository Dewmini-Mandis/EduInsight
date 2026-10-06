import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { Plus, X, AlertCircle } from "lucide-react";
import SuccessBanner from "../../components/SuccessBanner";
import "../../styles/teacher.css";

const CreateLesson = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState("");
  const [terms, setTerms] = useState<any[]>([]);
  
  // Skills list state
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillError, setSkillError] = useState("");
  const skillInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const quizId = queryParams.get("quizId");

  const user = getUser() as any;
  const isTeacher = user?.role === "TEACHER" || user?.role?.role_name === "TEACHER" || location.pathname.startsWith("/teacher");
  const basePath = location.pathname.startsWith("/system-admin") ? "/system-admin/lessons" : "/teacher/lessons";

  useEffect(() => {
    if (isTeacher) {
      return;
    }
    const fetchTerms = async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/quizzes/terms/", {
          headers: { Authorization: `Token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTerms(data);
          if (data.length > 0) {
            setTerm(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching terms", err);
      }
    };
    fetchTerms();
  }, [isTeacher]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "title":
        if (!value.trim()) return "Lesson title is required.";
        return "";
      case "term":
        if (!value) return "Term is required.";
        return "";
      case "description":
        if (!value.trim()) return "Lesson description is required.";
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
    else if (field === "description") val = description;
    const err = validateField(field, val);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleFieldChange = (field: string, val: string) => {
    if (field === "title") setTitle(val);
    else if (field === "term") setTerm(val);
    else if (field === "description") setDescription(val);

    if (touched[field]) {
      const err = validateField(field, val);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleAddSkill = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();

    if (!trimmed) {
      setSkillError("Enter a skill name first.");
      return;
    }

    const normalized = trimmed.toLowerCase();
    const duplicate = skills.some(s => s.trim().toLowerCase() === normalized);

    if (duplicate) {
      setSkillError("This skill has already been added.");
      return;
    }

    setSkills(prev => [...prev, trimmed]);
    setSkillInput("");
    setSkillError("");

    setTimeout(() => {
      skillInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills(prev => prev.filter(s => s !== skillName));
  };

  const handleSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillInput(e.target.value);
    if (skillError) setSkillError("");
  };

  if (isTeacher) {
    return (
      <div className="teacher-card" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
        <h2 className="teacher-card-title" style={{ fontSize: "20px", marginBottom: "16px", color: "#E9283A" }}>
          Access Denied
        </h2>
        <p style={{ color: "#5D78A3", marginBottom: "24px" }}>
          Teachers are only authorized to view lesson content. Lesson creation is restricted to System Administrators.
        </p>
        <button className="teacher-btn-primary" onClick={() => navigate("/teacher/lessons")}>
          Back to Lessons
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = {
      title: validateField("title", title),
      term: validateField("term", term),
      description: validateField("description", description),
    };

    setFieldErrors(errors);
    setTouched({ title: true, term: true, description: true });

    if (errors.title) {
      titleRef.current?.focus();
      return;
    }
    if (errors.term) {
      termRef.current?.focus();
      return;
    }
    if (errors.description) {
      descriptionRef.current?.focus();
      return;
    }

    setSubmitting(true);
    const token = getToken();

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      term: parseInt(term)
    };
    if (quizId) {
      payload.quiz = quizId;
    }

    try {
      // 1. Create Lesson
      const res = await fetch("/api/quizzes/lessons/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.title) setFieldErrors(prev => ({ ...prev, title: Array.isArray(errorData.title) ? errorData.title.join(" ") : errorData.title }));
        if (errorData.term) setFieldErrors(prev => ({ ...prev, term: Array.isArray(errorData.term) ? errorData.term.join(" ") : errorData.term }));
        if (errorData.description) setFieldErrors(prev => ({ ...prev, description: Array.isArray(errorData.description) ? errorData.description.join(" ") : errorData.description }));
        throw new Error(errorData.detail || "Unable to save lesson.");
      }

      const createdLesson = await res.json();

      // 2. Create associated Skills directly for the created lesson
      if (skills.length > 0) {
        await Promise.all(
          skills.map(skillName =>
            fetch("/api/quizzes/skills/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`
              },
              body: JSON.stringify({
                name: skillName,
                lesson: createdLesson.id,
                is_active: true
              })
            })
          )
        );
      }

      setSuccessMsg("Lesson created successfully.");
      setTimeout(() => {
        if (quizId) {
          navigate(`/teacher/quizzes/${quizId}/edit`);
        } else {
          navigate(basePath);
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create lesson.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="teacher-card" style={{ maxWidth: "680px", margin: "0 auto" }}>
      <h2 className="teacher-card-title" style={{ fontSize: "20px", marginBottom: "24px" }}>
        {quizId ? "Add Remedial Lesson" : "Create Lesson"}
      </h2>

      {successMsg && (
        <SuccessBanner 
          message={successMsg} 
          onClose={() => setSuccessMsg("")} 
          style={{ marginBottom: "20px" }} 
        />
      )}
      
      {error && <div className="teacher-badge danger" style={{ width: "100%", padding: "12px", marginBottom: "20px" }}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="teacher-form-group">
          <label className="teacher-form-label" htmlFor="lesson-title">
            Lesson Title <span style={{ color: "#FF4054" }}>*</span>
          </label>
          <input
            id="lesson-title"
            ref={titleRef}
            type="text"
            aria-required="true"
            aria-invalid={Boolean(touched.title && fieldErrors.title)}
            aria-describedby={touched.title && fieldErrors.title ? "title-error" : undefined}
            className={`teacher-form-input ${touched.title && fieldErrors.title ? "is-invalid" : ""}`}
            placeholder="e.g., Perimeter and Area of 2D Shapes"
            value={title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            onBlur={() => handleBlur("title")}
          />
          {touched.title && fieldErrors.title && (
            <div id="title-error" className="admin-field-error" style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertCircle size={14} />
              <span>{fieldErrors.title}</span>
            </div>
          )}
        </div>

        {/* Term */}
        <div className="teacher-form-group">
          <label className="teacher-form-label" htmlFor="lesson-term">
            Academic Term <span style={{ color: "#FF4054" }}>*</span>
          </label>
          <select
            id="lesson-term"
            ref={termRef}
            aria-required="true"
            aria-invalid={Boolean(touched.term && fieldErrors.term)}
            aria-describedby={touched.term && fieldErrors.term ? "term-error" : undefined}
            className={`teacher-dropdown-filter ${touched.term && fieldErrors.term ? "is-invalid" : ""}`}
            style={{ width: "100%" }}
            value={term}
            onChange={(e) => handleFieldChange("term", e.target.value)}
            onBlur={() => handleBlur("term")}
          >
            <option value="">Select a term</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {touched.term && fieldErrors.term && (
            <div id="term-error" className="admin-field-error" style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertCircle size={14} />
              <span>{fieldErrors.term}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="teacher-form-group">
          <label className="teacher-form-label" htmlFor="lesson-description">
            Lesson Description <span style={{ color: "#FF4054" }}>*</span>
          </label>
          <textarea
            id="lesson-description"
            ref={descriptionRef}
            aria-required="true"
            aria-invalid={Boolean(touched.description && fieldErrors.description)}
            aria-describedby={touched.description && fieldErrors.description ? "description-error" : undefined}
            className={`teacher-form-input ${touched.description && fieldErrors.description ? "is-invalid" : ""}`}
            style={{ minHeight: "100px", fontFamily: "inherit" }}
            placeholder="Provide detail on concepts covered under this syllabus lesson..."
            value={description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            onBlur={() => handleBlur("description")}
          />
          {touched.description && fieldErrors.description && (
            <div id="description-error" className="admin-field-error" style={{ color: "#FF4054", fontSize: "13px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
              <AlertCircle size={14} />
              <span>{fieldErrors.description}</span>
            </div>
          )}
        </div>

        {/* Skills Section (Direct Lesson -> Skills association) */}
        <div className="teacher-form-group" style={{ marginTop: "24px" }}>
          <label className="teacher-form-label">
            Lesson Skills
          </label>
          
          <div className="class-input-row" style={{ display: "flex", gap: "12px", alignItems: "flex-start", width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                ref={skillInputRef}
                type="text"
                className="teacher-form-input"
                style={{ width: "100%", height: "48px", boxSizing: "border-box" }}
                placeholder="Enter skill name..."
                value={skillInput}
                onChange={handleSkillInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="admin-btn-add-class"
              onClick={handleAddSkill}
              style={{
                height: "48px",
                padding: "0 16px",
                borderRadius: "9px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#126BFF",
                backgroundColor: "#F7FAFE",
                border: "1px solid #BFD4F5",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              <Plus size={16} />
              Add Skill
            </button>
          </div>

          {skillError && (
            <div style={{ fontSize: "13px", color: "#FF4054", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={14} />
              <span>{skillError}</span>
            </div>
          )}

          {/* Skill Pills List */}
          {skills.length > 0 && (
            <div className="class-pill-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
              {skills.map((skillName) => (
                <span
                  key={skillName}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#EAF3FF",
                    color: "#126BFF",
                    border: "1px solid #CFE0FF",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  <span>{skillName}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${skillName}`}
                    onClick={() => handleRemoveSkill(skillName)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#5D78A3",
                      cursor: "pointer",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px" }}>
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
            {submitting ? "Saving..." : "Save Lesson"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLesson;
