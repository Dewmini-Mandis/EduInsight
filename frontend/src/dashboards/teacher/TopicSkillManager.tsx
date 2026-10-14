import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { Plus, Trash2, AlertCircle, Award } from "lucide-react";

import LessonTopicHeader from "./topics/LessonTopicHeader";

type Skill = {
  id: number;
  name: string;
  lesson: number;
  is_active?: boolean;
};

const TopicSkillManager = () => {
  const { lessonId } = useParams();
  const location = useLocation();

  const user = getUser() as any;
  const isReadOnly = location.pathname.startsWith("/teacher") || user?.role?.role_name === "TEACHER" || user?.role === "TEACHER";
  const basePath = isReadOnly ? "/teacher/lessons" : "/system-admin/lessons";

  const [lesson, setLesson] = useState<any>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Skill input & state
  const [skillInput, setSkillInput] = useState("");
  const [skillError, setSkillError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const token = getToken();
    try {
      const [lessonRes, skillsRes] = await Promise.all([
        fetch(`/api/quizzes/lessons/${lessonId}/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/skills/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } })
      ]);

      if (lessonRes.ok && skillsRes.ok) {
        setLesson(await lessonRes.json());
        const skillsData = await skillsRes.json();
        setSkills(Array.isArray(skillsData) ? skillsData : (skillsData.results || []));
      }
    } catch (err) {
      console.error("Failed to load lesson and skill data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const handleAddSkill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    const trimmed = skillInput.trim();

    if (!trimmed) {
      setSkillError("Enter a skill name first.");
      return;
    }

    const normalized = trimmed.toLowerCase();
    const duplicate = skills.some(
      skill => skill.name.trim().toLowerCase() === normalized
    );

    if (duplicate) {
      setSkillError("This skill has already been added.");
      return;
    }

    setSubmitting(true);
    setSkillError("");
    const token = getToken();

    try {
      const res = await fetch("/api/quizzes/skills/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          name: trimmed,
          lesson: lessonId,
          is_active: true
        })
      });

      if (res.ok) {
        setSkillInput("");
        fetchData();
        setTimeout(() => {
          skillInputRef.current?.focus();
        }, 0);
      } else {
        const errData = await res.json();
        setSkillError(errData.detail || errData.name?.[0] || "Failed to add skill.");
      }
    } catch (err) {
      console.error(err);
      setSkillError("An error occurred while adding the skill.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to delete this skill?")) return;

    const token = getToken();
    try {
      const res = await fetch(`/api/quizzes/skills/${skillId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete skill.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3" }}>Loading lesson skills...</div>;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column" }}>
      
      <LessonTopicHeader 
        lessonTitle={lesson?.title} 
        isReadOnly={isReadOnly}
        basePath={basePath}
      />

      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
            Associated Skills
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3" }}>
            Manage the skills associated with this lesson.
          </p>
        </div>

        {/* Skill Add Input Form */}
        {!isReadOnly && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  ref={skillInputRef}
                  type="text"
                  className="teacher-form-input"
                  style={{ width: "100%", height: "48px", boxSizing: "border-box" }}
                  placeholder="Enter skill name..."
                  value={skillInput}
                  onChange={(e) => {
                    setSkillInput(e.target.value);
                    if (skillError) setSkillError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  disabled={submitting}
                />
              </div>
              <button
                type="button"
                className="admin-btn-add-class"
                onClick={() => handleAddSkill()}
                disabled={submitting}
                style={{
                  height: "48px",
                  padding: "0 20px",
                  borderRadius: "9px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#FFFFFF",
                  background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(18, 107, 255, 0.25)",
                  opacity: submitting ? 0.7 : 1
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                {submitting ? "Adding..." : "Add Skill"}
              </button>
            </div>

            {skillError && (
              <div style={{ fontSize: "13px", color: "#FF4054", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={15} />
                <span>{skillError}</span>
              </div>
            )}
          </div>
        )}

        {/* Skill List Container */}
        {skills.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px 20px", 
            backgroundColor: "#F7FAFE", 
            borderRadius: "12px", 
            border: "1px dashed #DCE6F3" 
          }}>
            <Award size={36} color="#A0B4D0" style={{ marginBottom: "8px" }} />
            <h4 style={{ color: "#0B1F3A", margin: "0 0 6px 0", fontSize: "16px" }}>No skills added yet</h4>
            <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>
              {isReadOnly ? "No skills are currently assigned to this lesson." : "Add skills above to define learning outcomes for this lesson."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {skills.map((skill, index) => (
              <div
                key={skill.id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  transition: "all 150ms ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "#EAF3FF",
                    color: "#126BFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700"
                  }}>
                    {index + 1}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#0B1F3A" }}>
                    {skill.name}
                  </span>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSkill(skill.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "none",
                      color: "#FF4054",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "6px"
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSkillManager;
