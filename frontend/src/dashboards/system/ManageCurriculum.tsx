import React, { useState, useEffect } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, BookOpen, Layers } from "lucide-react";

interface Term {
  id: number;
  name: string;
  is_active: boolean;
  order: number;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  term: number;
  is_active: boolean;
}

interface Skill {
  id: number;
  name: string;
  lesson: number | null;
  is_active: boolean;
}

const ManageCurriculum = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModalMode, setLessonModalMode] = useState<"create" | "edit">("create");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeTermId, setActiveTermId] = useState<number | null>(null);
  const [lessonFormData, setLessonFormData] = useState({ title: "", description: "", is_active: true });

  // Skill Modal State (Super Admin Only)
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillModalMode, setSkillModalMode] = useState<"create" | "edit">("create");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [targetLessonId, setTargetLessonId] = useState<number | null>(null);
  const [skillFormData, setSkillFormData] = useState({ name: "", is_active: true });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "lesson" | "skill"; item: any } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [termRes, lessonRes, skillRes] = await Promise.all([
        fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/skills/", { headers: { Authorization: `Token ${token}` } })
      ]);
      if (termRes.ok) {
        const data = await termRes.json();
        setTerms(Array.isArray(data) ? data : (data.results || []));
      }
      if (lessonRes.ok) {
        const data = await lessonRes.json();
        setLessons(Array.isArray(data) ? data : (data.results || []));
      }
      if (skillRes.ok) {
        const data = await skillRes.json();
        setSkills(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Validation states for Lesson & Skill forms
  const [lessonTouched, setLessonTouched] = useState<Record<string, boolean>>({});
  const [lessonErrors, setLessonErrors] = useState<Record<string, string>>({});
  const lessonTitleRef = React.useRef<HTMLInputElement>(null);

  const [skillTouched, setSkillTouched] = useState<Record<string, boolean>>({});
  const [skillErrors, setSkillErrors] = useState<Record<string, string>>({});
  const skillNameRef = React.useRef<HTMLInputElement>(null);

  // Lesson Handlers
  const handleOpenCreateLesson = (termId: number) => {
    setActiveTermId(termId);
    setLessonModalMode("create");
    setLessonFormData({ title: "", description: "", is_active: true });
    setLessonTouched({});
    setLessonErrors({});
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveTermId(lesson.term);
    setLessonModalMode("edit");
    setLessonFormData({ title: lesson.title, description: lesson.description, is_active: lesson.is_active });
    setLessonTouched({});
    setLessonErrors({});
    setShowLessonModal(true);
  };

  const validateLessonField = (name: string, val: string) => {
    if (name === "title" && !val.trim()) return "Lesson title is required.";
    return "";
  };

  const handleLessonBlur = (name: string) => {
    setLessonTouched((prev) => ({ ...prev, [name]: true }));
    const val = (lessonFormData as any)[name] || "";
    setLessonErrors((prev) => ({ ...prev, [name]: validateLessonField(name, val) }));
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleErr = validateLessonField("title", lessonFormData.title);
    setLessonErrors({ title: titleErr });
    setLessonTouched({ title: true });

    if (titleErr) {
      lessonTitleRef.current?.focus();
      return;
    }

    const token = getToken();
    if (!token || !activeTermId) return;

    setActionLoading(true);
    const url = lessonModalMode === "create" ? `/api/quizzes/lessons/` : `/api/quizzes/lessons/${selectedLesson?.id}/`;
    const method = lessonModalMode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          title: lessonFormData.title.trim(),
          description: lessonFormData.description.trim(),
          term: activeTermId,
          is_active: lessonFormData.is_active
        })
      });

      if (res.ok) {
        setShowLessonModal(false);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.title) setLessonErrors(prev => ({ ...prev, title: Array.isArray(errData.title) ? errData.title.join(" ") : errData.title }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Skill Handlers (Super Admin Only)
  const handleOpenCreateSkill = (lessonId: number) => {
    setTargetLessonId(lessonId);
    setSkillModalMode("create");
    setSkillFormData({ name: "", is_active: true });
    setSkillTouched({});
    setSkillErrors({});
    setShowSkillModal(true);
  };

  const handleOpenEditSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setTargetLessonId(skill.lesson);
    setSkillModalMode("edit");
    setSkillFormData({ name: skill.name, is_active: skill.is_active });
    setSkillTouched({});
    setSkillErrors({});
    setShowSkillModal(true);
  };

  const validateSkillField = (name: string, val: string) => {
    if (name === "name" && !val.trim()) return "Skill name is required.";
    return "";
  };

  const handleSkillBlur = (name: string) => {
    setSkillTouched((prev) => ({ ...prev, [name]: true }));
    const val = (skillFormData as any)[name] || "";
    setSkillErrors((prev) => ({ ...prev, [name]: validateSkillField(name, val) }));
  };

  const handleSubmitSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateSkillField("name", skillFormData.name);
    setSkillErrors({ name: nameErr });
    setSkillTouched({ name: true });

    if (nameErr) {
      skillNameRef.current?.focus();
      return;
    }

    const token = getToken();
    if (!token || !targetLessonId) return;

    setActionLoading(true);
    const url = skillModalMode === "create" ? `/api/quizzes/skills/` : `/api/quizzes/skills/${selectedSkill?.id}/`;
    const method = skillModalMode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          name: skillFormData.name.trim(),
          lesson: targetLessonId,
          is_active: skillFormData.is_active
        })
      });

      if (res.ok) {
        setShowSkillModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        if (errData.name) {
          setSkillErrors(prev => ({ ...prev, name: Array.isArray(errData.name) ? errData.name.join(" ") : errData.name }));
        } else {
          alert(errData.detail || "Failed to save skill.");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSkillActive = async (skill: Skill) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/quizzes/skills/${skill.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ is_active: !skill.is_active })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async () => {
    const token = getToken();
    if (!token || !deleteTarget) return;

    const { type, item } = deleteTarget;
    const url = type === "lesson" ? `/api/quizzes/lessons/${item.id}/` : `/api/quizzes/skills/${item.id}/`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        setShowDeleteModal(false);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || `Cannot delete ${type}. It may be linked to active quizzes or historical data.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const lessonColumns = (termId: number): Column<Lesson>[] => [
    { 
      key: "title", 
      header: "Lesson Title", 
      width: "25%", 
      render: (item) => (
        <div>
          <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.title}</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{item.description || "No description"}</div>
        </div>
      ) 
    },
    { 
      key: "skills", 
      header: "Assigned Skills (Super Admin)", 
      width: "50%", 
      render: (item) => {
        const lessonSkills = (Array.isArray(skills) ? skills : []).filter((s) => s.lesson === item.id);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {lessonSkills.length === 0 ? (
                <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>No skills assigned yet.</span>
              ) : (
                lessonSkills.map((s) => (
                  <div 
                    key={s.id} 
                    style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      padding: "4px 8px", 
                      borderRadius: "6px", 
                      fontSize: "12px", 
                      fontWeight: "500", 
                      backgroundColor: s.is_active ? "#eff6ff" : "#f1f5f9", 
                      color: s.is_active ? "#1e40af" : "#64748b",
                      border: s.is_active ? "1px solid #bfdbfe" : "1px solid #e2e8f0" 
                    }}
                  >
                    <span>{s.name}</span>
                    <button
                      onClick={() => handleToggleSkillActive(s)}
                      title={s.is_active ? "Click to Deactivate" : "Click to Activate"}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: s.is_active ? "#16a34a" : "#dc2626" }}
                    >
                      {s.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    </button>
                    <button
                      onClick={() => handleOpenEditSkill(s)}
                      title="Edit Skill"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#2563eb" }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => { setDeleteTarget({ type: "skill", item: s }); setShowDeleteModal(true); }}
                      title="Delete Skill"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#ef4444" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div>
              <button
                onClick={() => handleOpenCreateSkill(item.id)}
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "4px", 
                  background: "none", 
                  border: "none", 
                  color: "#2563eb", 
                  fontSize: "12px", 
                  fontWeight: "600", 
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <Plus size={12} /> Add Skill to Lesson
              </button>
            </div>
          </div>
        );
      } 
    },
    { 
      key: "status", 
      header: "Status", 
      width: "15%", 
      render: (item) => (
        <span style={{ padding: "4px 8px", backgroundColor: item.is_active ? "#d1fae5" : "#fee2e2", color: item.is_active ? "#065f46" : "#991b1b", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
          {item.is_active ? "Active" : "Inactive"}
        </span>
      ) 
    },
    { 
      key: "actions", 
      header: "Actions", 
      width: "10%", 
      render: (item) => (
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => handleOpenEditLesson(item)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "13px", fontWeight: "600", padding: 0 }}>Edit</button>
          <button onClick={() => { setDeleteTarget({ type: "lesson", item }); setShowDeleteModal(true); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "600", padding: 0 }}>Delete</button>
        </div>
      )
    }
  ];

  const termList = Array.isArray(terms) ? terms : [];
  const lessonList = Array.isArray(lessons) ? lessons : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>Curriculum & Master Skill Management</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Super Admin Control Panel: Manage Academic Terms, Lessons, and Master Skills.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading curriculum and skill data...</div>
      ) : (
        termList.map((term) => (
          <ChartCard 
            key={term.id} 
            title={term.name} 
            headerAction={
              <button 
                onClick={() => handleOpenCreateLesson(term.id)} 
                style={{ 
                  padding: "8px 16px", 
                  backgroundColor: "#2563eb", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "8px", 
                  cursor: "pointer", 
                  fontWeight: "600", 
                  fontSize: "13px" 
                }}
              >
                + Add Lesson
              </button>
            }
          >
            <div style={{ margin: "0 -20px" }}>
              {lessonList.filter((l) => l.term === term.id).length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                  No lessons found for {term.name}. Click "+ Add Lesson" to create one.
                </div>
              ) : (
                <DataTable 
                  columns={lessonColumns(term.id)} 
                  data={lessonList.filter((l) => l.term === term.id)} 
                  keyExtractor={(l) => l.id} 
                />
              )}
            </div>
          </ChartCard>
        ))
      )}

      {/* Create/Edit Lesson Modal */}
      {showLessonModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "420px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 24px 0", color: "#0f172a" }}>{lessonModalMode === "create" ? "Create Lesson" : "Edit Lesson"}</h3>
            <form onSubmit={handleSubmitLesson} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#234A7A" }}>
                  Lesson Title <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input
                  ref={lessonTitleRef}
                  type="text"
                  aria-required="true"
                  aria-invalid={Boolean(lessonTouched.title && lessonErrors.title)}
                  aria-describedby={lessonTouched.title && lessonErrors.title ? "lesson-title-error" : undefined}
                  className={`admin-form-input ${lessonTouched.title && lessonErrors.title ? "is-invalid" : ""}`}
                  value={lessonFormData.title}
                  onChange={(e) => {
                    setLessonFormData({ ...lessonFormData, title: e.target.value });
                    if (lessonTouched.title) setLessonErrors(prev => ({ ...prev, title: validateLessonField("title", e.target.value) }));
                  }}
                  onBlur={() => handleLessonBlur("title")}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", outline: "none" }}
                />
                {lessonTouched.title && lessonErrors.title && (
                  <div id="lesson-title-error" style={{ color: "#FF4054", fontSize: "12px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span>{lessonErrors.title}</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#234A7A" }}>Description</label>
                <textarea value={lessonFormData.description} onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", minHeight: "80px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="lesson_is_active" checked={lessonFormData.is_active} onChange={(e) => setLessonFormData({ ...lessonFormData, is_active: e.target.checked })} />
                <label htmlFor="lesson_is_active" style={{ fontSize: "14px", fontWeight: "500" }}>Active</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowLessonModal(false)} disabled={actionLoading} style={{ padding: "10px 16px", background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  {actionLoading ? "Saving..." : "Save Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Skill Modal (Super Admin Only) */}
      {showSkillModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "420px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 24px 0", color: "#0f172a" }}>{skillModalMode === "create" ? "Add Skill to Lesson" : "Edit Master Skill"}</h3>
            <form onSubmit={handleSubmitSkill} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#234A7A" }}>
                  Skill Name <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input
                  ref={skillNameRef}
                  type="text"
                  aria-required="true"
                  aria-invalid={Boolean(skillTouched.name && skillErrors.name)}
                  aria-describedby={skillTouched.name && skillErrors.name ? "skill-name-error" : undefined}
                  className={`admin-form-input ${skillTouched.name && skillErrors.name ? "is-invalid" : ""}`}
                  placeholder="e.g. Calculate perimeter of rectangles"
                  value={skillFormData.name}
                  onChange={(e) => {
                    setSkillFormData({ ...skillFormData, name: e.target.value });
                    if (skillTouched.name) setSkillErrors(prev => ({ ...prev, name: validateSkillField("name", e.target.value) }));
                  }}
                  onBlur={() => handleSkillBlur("name")}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", outline: "none" }}
                />
                {skillTouched.name && skillErrors.name && (
                  <div id="skill-name-error" style={{ color: "#FF4054", fontSize: "12px", fontWeight: "500", marginTop: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span>{skillErrors.name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="skill_is_active" checked={skillFormData.is_active} onChange={(e) => setSkillFormData({ ...skillFormData, is_active: e.target.checked })} />
                <label htmlFor="skill_is_active" style={{ fontSize: "14px", fontWeight: "500" }}>Active (Selectable for Quizzes & Materials)</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowSkillModal(false)} disabled={actionLoading} style={{ padding: "10px 16px", background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: "10px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  {actionLoading ? "Saving..." : "Save Skill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#dc2626" }}>Delete {deleteTarget?.type === "lesson" ? "Lesson" : "Skill"}</h3>
            <p style={{ margin: "0 0 24px 0", color: "#64748b", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteTarget?.item?.title || deleteTarget?.item?.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDeleteItem} style={{ padding: "10px 16px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCurriculum;
