import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import TermLessonsHeader from "../../components/student/TermLessonsHeader";
import LessonCard, { LessonData } from "../../components/student/LessonCard";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

const TermLessonsPage: React.FC = () => {
  const { termName: paramTerm } = useParams<{ termName: string }>();
  const termName = paramTerm ? decodeURIComponent(paramTerm) : "Term 1";

  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (token) {
          const [lessonsRes, quizzesRes, attemptsRes] = await Promise.allSettled([
            fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${token}` } }),
            fetch("/api/quizzes/", { headers: { Authorization: `Token ${token}` } }),
            fetch("/api/attempts/attempts/", { headers: { Authorization: `Token ${token}` } }),
          ]);

          let lessonsList: any[] = [];
          if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
            const lessonsData = await lessonsRes.value.json();
            lessonsList = Array.isArray(lessonsData) ? lessonsData : lessonsData.results || [];
          }

          let quizzesList: any[] = [];
          if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
            const quizzesData = await quizzesRes.value.json();
            quizzesList = Array.isArray(quizzesData) ? quizzesData : quizzesData.results || [];
          }

          let attemptsList: any[] = [];
          if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
            const attemptsData = await attemptsRes.value.json();
            attemptsList = Array.isArray(attemptsData) ? attemptsData : attemptsData.results || [];
          }

          const filtered = lessonsList.filter((l) => l.term_name === termName);

          if (filtered.length > 0) {
            const mapped: LessonData[] = filtered.map((l) => {
              const lQuizzes = quizzesList.filter((q) => {
                const qLessonId = typeof q.lesson === "object" ? q.lesson?.id : q.lesson;
                return String(qLessonId) === String(l.id);
              });

              const completedQuizzes = lQuizzes.filter((q) =>
                attemptsList.some((att) => att.quiz === q.id && att.score >= (q.pass_mark || 75))
              ).length;
              const hasAttempts = lQuizzes.some((q) =>
                attemptsList.some((att) => att.quiz === q.id)
              );

              const progressPct =
                lQuizzes.length > 0 ? Math.round((completedQuizzes / lQuizzes.length) * 100) : 0;

              let statusVal: "Pending" | "In Progress" | "Completed" = "Pending";
              if (progressPct === 100) statusVal = "Completed";
              else if (hasAttempts || completedQuizzes > 0) statusVal = "In Progress";

              return {
                id: l.id.toString(),
                title: l.title,
                description: l.description,
                status: statusVal,
                progress: progressPct,
                quizzesCount: lQuizzes.length,
                estimatedMinutes: lQuizzes.length * 15,
              };
            });
            setLessons(mapped);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching term lessons:", err);
      }

      setLessons([]);
      setLoading(false);
    };

    fetchLessons();
  }, [termName]);

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
    { label: "Lessons" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Breadcrumbs items={breadcrumbsList} />
      <TermLessonsHeader termName={termName} />

      <div className="student-card">
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0B1F3A", margin: "0 0 4px" }}>
          Academic Lessons for {termName}
        </h2>
        <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 24px" }}>
          Explore your lessons, track progress, and strengthen your understanding.
        </p>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
            Loading lessons...
          </div>
        ) : lessons.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
            No lessons found for {termName}.
          </div>
        ) : (
          <div className="student-lessons-grid">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} termName={termName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TermLessonsPage;
