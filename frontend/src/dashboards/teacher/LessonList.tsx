import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { BookOpen, Plus } from "lucide-react";
import TermSyllabusCard from "./lessons/TermSyllabusCard";
import LessonTable from "./lessons/LessonTable";

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

type AcademicTerm = {
  id: number;
  name: string;
  order: number;
};

type LessonItem = {
  id: number;
  title: string;
  description: string;
  term: number; // Term ID
  term_name?: string; // Optional, populated on frontend if needed
};

const LessonList = () => {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverAdd, setHoverAdd] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const [termsRes, lessonsRes] = await Promise.all([
        fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (termsRes.ok && lessonsRes.ok) {
        setTerms(await termsRes.json());
        setLessons(await lessonsRes.json());
      } else {
        console.error("Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching terms or lessons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteLesson = async (lessonId: number) => {
    if (window.confirm("Are you sure you want to delete this lesson? This will permanently delete all associated topics and skills.")) {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/lessons/${lessonId}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` }
        });
        if (res.ok) {
          fetchData();
        } else {
          alert("Failed to delete lesson.");
        }
      } catch (e) {
        alert("Error deleting lesson.");
      }
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3" }}>Loading lessons...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "1280px", margin: "0 auto" }}>
      
      {/* Inline Header matching LessonTopicHeader */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "20px" : "0",
        marginBottom: "24px"
      }}>
        {/* Left side */}
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
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
              Lessons
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              Manage your lesson plans, topics, and skills.
            </p>
          </div>
        </div>

        {/* Right side */}
        <div style={{ 
          display: "flex", 
          width: isMobile ? "100%" : "auto"
        }}>
          <button
            onClick={() => navigate("/teacher/lessons/create")}
            onMouseEnter={() => setHoverAdd(true)}
            onMouseLeave={() => setHoverAdd(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "42px",
              padding: "0 20px",
              background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
              border: "none",
              borderRadius: "9px",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
              transform: hoverAdd ? "translateY(-1px)" : "none",
              filter: hoverAdd ? "brightness(0.95)" : "none",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Lesson
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {terms.length === 0 ? (
           <div style={{ textAlign: "center", color: "#5D78A3", padding: "2rem" }}>No academic terms configured in the system.</div>
        ) : (
        terms.map((term) => {
          const termLessons = lessons.filter(l => l.term === term.id);
          if (termLessons.length === 0) return null;

          return (
            <TermSyllabusCard 
              key={term.id} 
              title={`${term.name} Syllabus`} 
              subtitle={`Lessons planned for ${term.name}`}
              lessonCount={termLessons.length}
            >
              <LessonTable 
                lessons={termLessons} 
                onManageTopics={(id: number) => navigate(`/teacher/lessons/${id}/topics`)} 
                onDelete={handleDeleteLesson} 
              />
            </TermSyllabusCard>
          );
        })
      )}
      </div>
    </div>
  );
};

export default LessonList;
