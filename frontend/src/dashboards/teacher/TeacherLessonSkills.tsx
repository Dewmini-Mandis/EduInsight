import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { BookOpen, ArrowLeft, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import "../../styles/teacher.css";

interface SkillItem {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface LessonDetail {
  id: number;
  title: string;
  description?: string;
  term?: number;
  term_name?: string;
  order?: number;
  status?: string;
}

const TeacherLessonSkills: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      const token = getToken();
      try {
        const [termsRes, lessonRes, skillsRes] = await Promise.all([
          fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
          fetch(`/api/quizzes/lessons/${lessonId}/`, { headers: { Authorization: `Token ${token}` } }),
          fetch(`/api/quizzes/skills/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } }),
        ]);

        let termsList: any[] = [];
        if (termsRes.ok) {
          const termsData = await termsRes.json();
          termsList = Array.isArray(termsData) ? termsData : termsData.results || [];
        }

        if (lessonRes.ok) {
          const lessonData = await lessonRes.json();
          const foundTerm = termsList.find((t) => t.id === lessonData.term);
          setLesson({
            ...lessonData,
            term_name: foundTerm ? foundTerm.name : lessonData.term_name || "Academic Term",
          });
        } else {
          setError("Failed to load lesson details.");
        }

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          const list = Array.isArray(skillsData) ? skillsData : skillsData.results || [];
          setSkills(list);
        }
      } catch (err) {
        console.error("Error loading lesson skills:", err);
        setError("Error loading lesson skills.");
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchData();
    }
  }, [lessonId]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
        Loading lesson skills...
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate("/teacher/lessons")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            height: "40px",
            padding: "0 16px",
            borderRadius: "9px",
            border: "1px solid #DCE6F3",
            backgroundColor: "#FFFFFF",
            color: "#3D5E8A",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          <ArrowLeft size={16} /> Back to Lessons
        </button>
        <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#FFF5F5", border: "1px solid #FFB8BE", color: "#FF3347", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={20} />
          <span>{error || "Lesson not found."}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1100px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Page Header */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4ECF6",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#EAF3FF",
              color: "#126BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0B1F3A" }}>
              Lesson Skills
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              View lesson information and associated skills.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/teacher/lessons")}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "9px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            color: "#3D5E8A",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 150ms ease",
          }}
        >
          <ArrowLeft size={16} /> Back to Lessons
        </button>
      </div>

      {/* Lesson Details Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          boxShadow: "0 6px 20px rgba(18,63,110,0.05)",
          padding: "24px",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", fontSize: "17px", fontWeight: 700, color: "#0B1F3A", display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={18} color="#126BFF" />
          Lesson Details
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Lesson Title */}
          <div style={{ backgroundColor: "#F7FAFE", borderRadius: "12px", padding: "16px", border: "1px solid #E4ECF6" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#5D78A3", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Lesson Title
            </span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", marginTop: "6px" }}>
              {lesson.title}
            </div>
          </div>

          {/* Academic Term */}
          <div style={{ backgroundColor: "#F7FAFE", borderRadius: "12px", padding: "16px", border: "1px solid #E4ECF6" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#5D78A3", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Academic Term
            </span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#126BFF", marginTop: "6px" }}>
              {lesson.term_name || `Term ${lesson.term || 1}`}
            </div>
          </div>
        </div>

        {/* Lesson Description */}
        <div style={{ backgroundColor: "#F7FAFE", borderRadius: "12px", padding: "16px", border: "1px solid #E4ECF6" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#5D78A3", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Lesson Description
          </span>
          <div style={{ fontSize: "14px", color: "#3D5E8A", marginTop: "6px", lineHeight: "1.6" }}>
            {lesson.description && lesson.description.trim() ? lesson.description : "No description provided for this lesson."}
          </div>
        </div>
      </div>

      {/* Skills Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          boxShadow: "0 6px 20px rgba(18,63,110,0.05)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0B1F3A", display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={18} color="#126BFF" />
            Skills
          </h2>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#126BFF", background: "#EAF3FF", padding: "4px 12px", borderRadius: "999px" }}>
            {skills.length} {skills.length === 1 ? "Skill" : "Skills"}
          </span>
        </div>

        {skills.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#5D78A3", background: "#F7FAFE", borderRadius: "12px", border: "1px dashed #BFD4F5" }}>
            No skills associated with this lesson yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {skills.map((skill, index) => (
              <div
                key={skill.id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  backgroundColor: "#F7FAFE",
                  border: "1px solid #E4ECF6",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "#EAF3FF",
                    color: "#126BFF",
                    fontSize: "13px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>
                      {skill.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10B981", fontSize: "13px", fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  Active Skill
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherLessonSkills;
