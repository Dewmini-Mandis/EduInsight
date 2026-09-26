import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import LessonProgressCard from "../../components/student/LessonProgressCard";
import LessonQuizCard, { QuizItem } from "../../components/student/LessonQuizCard";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

const fallbackQuizzes: QuizItem[] = [
  {
    id: "q1",
    title: "Perimeter 1",
    order: 1,
    questionCount: 10,
    durationMinutes: 10,
    passMark: 75,
    maxAttempts: 3,
    attemptsUsed: 0,
    status: "AVAILABLE",
  },
  {
    id: "q2",
    title: "Perimeter 2",
    order: 2,
    questionCount: 10,
    durationMinutes: 10,
    passMark: 75,
    maxAttempts: 3,
    attemptsUsed: 0,
    status: "LOCKED",
    lockedReason: "Complete Perimeter 1 and pass to unlock this quiz.",
    previousQuizTitle: "Perimeter 1",
  },
];

const LessonQuizzesPage: React.FC = () => {
  const { termName: paramTerm, lessonId } = useParams<{ termName: string; lessonId: string }>();
  const navigate = useNavigate();

  const termName = paramTerm ? decodeURIComponent(paramTerm) : "Term 1";

  const [lessonTitle, setLessonTitle] = useState<string>("Perimeter");
  const [lessonDescription, setLessonDescription] = useState<string>(
    "Master the fundamentals of this topic."
  );
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [completedQuizzesCount, setCompletedQuizzesCount] = useState<number>(0);
  const [totalQuizzesCount, setTotalQuizzesCount] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSectionTitle, setActiveSectionTitle] = useState<string>("Quiz 1");

  useEffect(() => {
    const fetchLessonData = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (token && lessonId) {
          const [lessonRes, quizzesRes, attemptsRes] = await Promise.allSettled([
            fetch(`/api/quizzes/lessons/${lessonId}/`, {
              headers: { Authorization: `Token ${token}` },
            }),
            fetch(`/api/quizzes/?lesson=${lessonId}`, {
              headers: { Authorization: `Token ${token}` },
            }),
            fetch("/api/attempts/attempts/", {
              headers: { Authorization: `Token ${token}` },
            }),
          ]);

          if (lessonRes.status === "fulfilled" && lessonRes.value.ok) {
            const lData = await lessonRes.value.json();
            if (lData.title) setLessonTitle(lData.title);
            if (lData.description) setLessonDescription(lData.description);
          }

          let quizListRaw: any[] = [];
          if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
            const qData = await quizzesRes.value.json();
            quizListRaw = Array.isArray(qData) ? qData : qData.results || [];
          }

          let attemptsList: any[] = [];
          if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
            const attData = await attemptsRes.value.json();
            attemptsList = Array.isArray(attData) ? attData : attData.results || [];
          }

          if (quizListRaw.length > 0) {
            // Sort quizzes by order / id
            quizListRaw.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id);

            // Determine pass status for each quiz
            const processedQuizzes = quizListRaw.map((q) => {
              const passMark = q.pass_mark || 75;
              const qAttempts = attemptsList.filter((att) => att.quiz === q.id);
              const submittedAttempts = qAttempts.filter((att) => att.status === "SUBMITTED");
              const inProgressAttempt = qAttempts.find((att) => att.status === "IN_PROGRESS");
              const passedAttempt = submittedAttempts.find((att) => att.score !== null && att.score >= passMark);

              // Latest attempt id for viewing results
              const latestAtt = qAttempts[0] || null;

              return {
                rawQuiz: q,
                id: q.id,
                title: q.title,
                order: q.order || 1,
                questionCount: q.questions ? q.questions.length : 10,
                durationMinutes: q.estimated_time_minutes || 10,
                passMark,
                maxAttempts: q.max_attempts || 3,
                attemptsUsed: submittedAttempts.length,
                isPassed: !!passedAttempt,
                hasInProgress: !!inProgressAttempt,
                latestAttemptId: latestAtt ? latestAtt.id : null,
                latestScore: latestAtt ? latestAtt.score : null,
              };
            });

            // Find index of first unpassed quiz (active quiz step)
            let firstUnpassedIdx = processedQuizzes.findIndex((pq) => !pq.isPassed);
            if (firstUnpassedIdx === -1) {
              // All quizzes passed
              firstUnpassedIdx = processedQuizzes.length;
            }

            const passedCount = processedQuizzes.filter((pq) => pq.isPassed).length;
            const totalCount = processedQuizzes.length;
            const pct = Math.round((passedCount / totalCount) * 100);

            // Construct visible quizzes list sequentially
            const visibleQuizzesList: QuizItem[] = [];

            for (let i = 0; i < processedQuizzes.length; i++) {
              const pq = processedQuizzes[i];

              if (i < firstUnpassedIdx) {
                // Previously passed quiz
                visibleQuizzesList.push({
                  id: pq.id,
                  title: pq.title,
                  order: pq.order,
                  questionCount: pq.questionCount,
                  durationMinutes: pq.durationMinutes,
                  passMark: pq.passMark,
                  maxAttempts: pq.maxAttempts,
                  attemptsUsed: pq.attemptsUsed,
                  status: "PASSED",
                  latestAttemptId: pq.latestAttemptId,
                  latestScore: pq.latestScore,
                });
              } else if (i === firstUnpassedIdx) {
                // Current active/unlocked quiz
                let status: QuizItem["status"] = "AVAILABLE";
                if (pq.hasInProgress) {
                  status = "IN_PROGRESS";
                } else if (pq.attemptsUsed >= pq.maxAttempts) {
                  status = "EXHAUSTED";
                } else if (pq.attemptsUsed > 0) {
                  status = "FAILED";
                }

                visibleQuizzesList.push({
                  id: pq.id,
                  title: pq.title,
                  order: pq.order,
                  questionCount: pq.questionCount,
                  durationMinutes: pq.durationMinutes,
                  passMark: pq.passMark,
                  maxAttempts: pq.maxAttempts,
                  attemptsUsed: pq.attemptsUsed,
                  status,
                  latestAttemptId: pq.latestAttemptId,
                  latestScore: pq.latestScore,
                });
              } else if (i === firstUnpassedIdx + 1) {
                // Next locked teaser card
                const prevPq = processedQuizzes[i - 1];
                visibleQuizzesList.push({
                  id: pq.id,
                  title: pq.title,
                  order: pq.order,
                  questionCount: pq.questionCount,
                  durationMinutes: pq.durationMinutes,
                  passMark: pq.passMark,
                  maxAttempts: pq.maxAttempts,
                  attemptsUsed: pq.attemptsUsed,
                  status: "LOCKED",
                  lockedReason: `Complete ${prevPq.title} and pass to unlock this quiz.`,
                  previousQuizTitle: prevPq.title,
                });
              }
              // i > firstUnpassedIdx + 1 remain COMPLETELY HIDDEN
            }

            // Section title header
            if (firstUnpassedIdx < processedQuizzes.length) {
              setActiveSectionTitle(`Quiz ${firstUnpassedIdx + 1}`);
            } else {
              setActiveSectionTitle("All Quizzes Completed!");
            }

            setQuizzes(visibleQuizzesList);
            setTotalQuizzesCount(totalCount);
            setCompletedQuizzesCount(passedCount);
            setOverallProgress(pct);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching lesson quizzes:", err);
      }

      setQuizzes(fallbackQuizzes);
      setTotalQuizzesCount(3);
      setCompletedQuizzesCount(0);
      setOverallProgress(0);
      setLoading(false);
    };

    fetchLessonData();
  }, [lessonId]);

  // Handle Start / Resume / Try Again
  const handleStartQuiz = (quizItem: QuizItem) => {
    navigate(
      `/student/quizzes/${quizItem.id}/attempt?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitle)}&lessonId=${lessonId}`
    );
  };

  // Handle View Results
  const handleViewResults = (quizItem: QuizItem) => {
    if (quizItem.latestAttemptId) {
      navigate(
        `/student/quizzes/${quizItem.id}/results/${quizItem.latestAttemptId}?termName=${encodeURIComponent(
          termName
        )}&lessonTitle=${encodeURIComponent(lessonTitle)}&lessonId=${lessonId}`
      );
    } else {
      handleStartQuiz(quizItem);
    }
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/learning-path" },
    { label: "Learning Path", path: "/student/learning-path" },
    { label: termName, path: `/student/learning-path/term/${encodeURIComponent(termName)}/lessons` },
    { label: lessonTitle },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Breadcrumbs items={breadcrumbsList} />

      {/* 1. Header Card */}
      <div className="student-header-card">
        <div className="student-header-left">
          <div className="student-header-icon-box">
            <BookOpen size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 className="student-header-title">{lessonTitle}</h1>
            <p className="student-header-subtitle">{lessonDescription}</p>
          </div>
        </div>

        <button
          type="button"
          className="student-btn-secondary"
          onClick={() =>
            navigate(`/student/learning-path/term/${encodeURIComponent(termName)}/lessons`)
          }
        >
          <ArrowLeft size={16} />
          Back to Lessons
        </button>
      </div>

      {/* 2. Lesson Progress Card */}
      <LessonProgressCard
        progress={overallProgress}
        completedQuizzes={completedQuizzesCount}
        totalQuizzes={totalQuizzesCount}
      />

      {/* 3. Sequential Quizzes Container Card */}
      <div className="student-card" style={{ padding: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0B1F3A", margin: "0 0 4px" }}>
          {activeSectionTitle}
        </h2>
        <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 20px" }}>
          Begin with the basic concepts and test your understanding.
        </p>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#5D78A3" }}>
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#5D78A3" }}>
            No quizzes available for this lesson.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {quizzes.map((quiz, idx) => (
              <LessonQuizCard
                key={quiz.id}
                quiz={quiz}
                index={idx}
                onStartQuiz={handleStartQuiz}
                onViewResults={handleViewResults}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonQuizzesPage;
