import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";

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
  const navigate = useNavigate();

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

  const columns: Column<LessonItem>[] = [
    {
      key: "title",
      header: "Lesson Title",
      render: (item) => <span style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.title}</span>
    },
    {
      key: "description",
      header: "Description",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.description}</span>
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={() => navigate(`/teacher/lessons/${item.id}/topics`)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--blue-600)", backgroundColor: "transparent", color: "var(--blue-600)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Manage Topics
          </button>
          <button
            onClick={() => handleDeleteLesson(item.id)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(245, 34, 61, 0.2)", backgroundColor: "rgba(245, 34, 61, 0.05)", color: "var(--danger)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading lessons...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button 
          onClick={() => navigate("/teacher/lessons/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Lesson
        </button>
      </div>

      {terms.length === 0 ? (
         <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No academic terms configured in the system.</div>
      ) : (
        terms.map((term) => {
          const termLessons = lessons.filter(l => l.term === term.id);
          if (termLessons.length === 0) return null;

          return (
            <ChartCard key={term.id} title={`${term.name} Syllabus`} subtitle={`Lessons planned for ${term.name}`}>
              <div style={{ margin: "0 -20px" }}>
                <DataTable columns={columns} data={termLessons} keyExtractor={(l) => l.id} />
              </div>
            </ChartCard>
          );
        })
      )}
    </div>
  );
};

export default LessonList;
