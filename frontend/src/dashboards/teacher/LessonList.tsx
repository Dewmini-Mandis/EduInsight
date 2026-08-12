import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";

type LessonItem = {
  id: number;
  title: string;
  description: string;
  term: string;
  quizCount?: number;
};

const LessonList = () => {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock data for UI
    setLessons([
      { id: 1, title: "Algebraic Expressions", description: "Introduction to algebraic expressions and factorization.", term: "1st Term", quizCount: 2 },
      { id: 2, title: "Linear Equations", description: "Solving basic linear equations with one variable.", term: "1st Term", quizCount: 1 },
      { id: 3, title: "Geometry Basics", description: "Introduction to points, lines, and angles.", term: "2nd Term", quizCount: 0 },
    ]);
  }, []);

  const handleDeleteLesson = (lessonId: number) => {
    // mock delete
    if (window.confirm("Delete this lesson?")) {
      setLessons(prev => prev.filter(l => l.id !== lessonId));
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
      key: "quizCount",
      header: "Linked Quizzes",
      render: (item) => <StatusBadge status="Low" label={`${item.quizCount} Quiz(zes)`} />
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

  const terms = ["1st Term", "2nd Term", "3rd Term"];

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading lessons...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button 
          onClick={() => navigate("/teacher/lessons/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Lesson Topic
        </button>
      </div>

      {terms.map((termName) => {
        const termLessons = lessons.filter(l => l.term === termName);
        if (termLessons.length === 0) return null;

        return (
          <ChartCard key={termName} title={`${termName} Syllabus`} subtitle={`Lessons planned for the ${termName.toLowerCase()}`}>
            <div style={{ margin: "0 -20px" }}>
              <DataTable columns={columns} data={termLessons} keyExtractor={(l) => l.id} />
            </div>
          </ChartCard>
        );
      })}

    </div>
  );
};

export default LessonList;
