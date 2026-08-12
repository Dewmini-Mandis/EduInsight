import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import FilterBar from "../../components/FilterBar";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";

type QuizItem = {
  id: number;
  title: string;
  description: string;
  lesson: number;
  lesson_title: string;
  learning_level: string;
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
  
  const navigate = useNavigate();

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
        setQuizzes(data);
      } else {
        setError("Failed to fetch quizzes");
      }
    } catch (err) {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyStatus = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner": return "Low";
      case "advanced": return "High";
      default: return "Medium";
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(search.toLowerCase());
    const matchesLesson = filterLesson === "All Topics" || quiz.lesson_title === filterLesson;
    const matchesLevel = filterDifficulty === "All Levels" || quiz.learning_level === filterDifficulty;
    return matchesSearch && matchesLesson && matchesLevel;
  });

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading quizzes...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header Actions */}
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
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={() => navigate("/teacher/materials/create")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--blue-600)", backgroundColor: "transparent", color: "var(--blue-600)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Material
          </button>
          
          <button 
            onClick={() => navigate("/teacher/quizzes/create")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Quiz
          </button>
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
                  <StatusBadge status={getDifficultyStatus(quiz.learning_level)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
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
