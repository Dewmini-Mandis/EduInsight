import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { FileText, Plus, BookOpen } from "lucide-react";

// Reusable Components
import FilterBar from "../../components/FilterBar";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";

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

type QuizItem = {
  id: number;
  title: string;
  description: string;
  lesson: number;
  lesson_title: string;
  learning_level?: string;
  quiz_level_name?: string;
  difficulty_name?: string;
  created_at: string;
  questions: any[];
};

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterLesson, setFilterLesson] = useState("All Topics");
  const [filterDifficulty, setFilterDifficulty] = useState("All Levels");
  
  const [hoverCreate, setHoverCreate] = useState(false);

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    const token = getToken();
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes/", {
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(Array.isArray(data) ? data : (data.results || []));
      } else {
        setError("Failed to fetch quizzes");
      }
    } catch (err) {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyStatus = (level?: string) => {
    if (!level) return "Medium";
    switch (level.toLowerCase()) {
      case "beginner": return "Low";
      case "easy": return "Low";
      case "advanced": return "High";
      case "hard": return "High";
      default: return "Medium";
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(search.toLowerCase());
    const matchesLesson = filterLesson === "All Topics" || quiz.lesson_title === filterLesson;
    const matchesLevel = filterDifficulty === "All Levels" || (quiz.quiz_level_name === filterDifficulty || quiz.learning_level === filterDifficulty);
    return matchesSearch && matchesLesson && matchesLevel;
  });

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading quizzes...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* New Header Card */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isMobile ? "20px" : "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#F1EDFF",
            color: "#6C4BFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? "24px" : "30px", fontWeight: "700", color: "#0B1F3A", lineHeight: 1.2 }}>
              Quizzes
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3", fontWeight: "400" }}>
              Manage and review all your quizzes.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto", flexDirection: isMobile ? "column" : "row" }}>
          <button 
            onClick={() => navigate("/teacher/quizzes/create")}
            onMouseEnter={() => setHoverCreate(true)}
            onMouseLeave={() => setHoverCreate(false)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px", 
              height: "42px", 
              padding: "0 20px", 
              borderRadius: "9px", 
              border: "none", 
              background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", 
              color: "white", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
              transform: hoverCreate ? "translateY(-1px)" : "none",
              filter: hoverCreate ? "brightness(0.95)" : "none",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Quiz
          </button>
        </div>
      </div>

      {/* Filter Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, maxWidth: "600px" }}>
          <FilterBar 
            searchPlaceholder="Search quizzes..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                label: "Topic",
                value: filterLesson,
                options: [
                  { label: "All Topics", value: "All Topics" },
                  { label: "Week 3 - Algebra", value: "Week 3 - Algebra" },
                  { label: "Week 5 - Algebra", value: "Week 5 - Algebra" }
                ],
                onChange: setFilterLesson
              },
              {
                label: "Difficulty",
                value: filterDifficulty,
                options: [
                  { label: "All Levels", value: "All Levels" },
                  { label: "Beginner", value: "Beginner" },
                  { label: "Intermediate", value: "Intermediate" },
                  { label: "Advanced", value: "Advanced" }
                ],
                onChange: setFilterDifficulty
              }
            ]}
          />
        </div>
      </div>

      {/* Quizzes List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", backgroundColor: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(20, 99, 243, 0.1)", color: "var(--blue-600)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--navy-950)", margin: "0 0 4px 0" }}>{quiz.title}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                      {quiz.lesson_title}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      {quiz.questions.length} Questions
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ padding: "4px 8px", borderRadius: "4px", backgroundColor: "var(--surface-muted)", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "500" }}>Grade 10</span>
                  <StatusBadge status={getDifficultyStatus(quiz.difficulty_name || quiz.quiz_level_name || quiz.learning_level)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button 
                onClick={() => navigate(`/teacher/materials?quiz=${quiz.id}`)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #126BFF", backgroundColor: "#EEF4FB", color: "#126BFF", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <BookOpen size={16} />
                Materials
              </button>
              <button 
                onClick={() => navigate(`/teacher/quizzes/${quiz.id}`)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
              >
                Edit Quiz
              </button>
              <button 
                onClick={() => navigate(`/teacher/quizzes/${quiz.id}/results`)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "none", backgroundColor: "rgba(101, 61, 245, 0.1)", color: "var(--purple)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
              >
                View Results
              </button>
            </div>
          </div>
        ))}

        {filteredQuizzes.length === 0 && (
          <EmptyState 
            title="No quizzes found" 
            description="Try adjusting your search or filters." 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          />
        )}
      </div>
    </div>
  );
};

export default QuizList;
