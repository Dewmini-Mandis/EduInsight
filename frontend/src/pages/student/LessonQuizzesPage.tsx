import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import LessonProgressCard from "../../components/student/LessonProgressCard";
import LessonQuizCard, { QuizItem } from "../../components/student/LessonQuizCard";
import { getToken } from "../../auth/authUtils";
import { sortQuizzesByProgression } from "../../utils/quizOrdering";
import { queryClient } from "../../api/queryClient";
import { CardSkeleton } from "../../components/common/Skeletons";

const LessonQuizzesPage: React.FC = () => {
  const { termName: paramTerm, lessonId } = useParams<{ termName: string; lessonId: string }>();
  const navigate = useNavigate();

  const termName = paramTerm ? decodeURIComponent(paramTerm) : "Term 1";

  const [lessonTitle, setLessonTitle] = useState<string>("Lesson Quizzes");
  const [lessonDescription, setLessonDescription] = useState<string>(
    "Master the fundamentals of this topic."
  );
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [completedQuizzesCount, setCompletedQuizzesCount] = useState<number>(0);
  const [totalQuizzesCount, setTotalQuizzesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSectionTitle, setActiveSectionTitle] = useState<string>("Lesson Quizzes");

  useEffect(() => {
    const fetchLessonData = async () => {
      setLoading(true);
      setQuizzes([]);
      setTotalQuizzesCount(0);
      setCompletedQuizzesCount(0);
      setOverallProgress(0);

      try {
        const token = getToken();
        if (token && lessonId) {
          const headers = { Authorization: `Token ${token}` };
          const data = await queryClient.fetchQuery(
            ["student", "lesson-progression", lessonId],
            async () => {
              const res = await fetch(`/api/quizzes/lessons/${lessonId}/student_quizzes/`, { headers });
              return res.ok ? await res.json() : null;
            },
            { staleTime: 60000 }
          );

          if (data) {
            if (data.lesson) {
              if (data.lesson.title) setLessonTitle(data.lesson.title);
              if (data.lesson.description) setLessonDescription(data.lesson.description);
            }

            const quizListRaw = data.quizzes || [];
            if (quizListRaw.length > 0) {
              const sortedQuizzes: any[] = sortQuizzesByProgression(quizListRaw);

              let firstUnpassedIdx = sortedQuizzes.findIndex((pq: any) => !pq.isPassed);
              if (firstUnpassedIdx === -1) {
                firstUnpassedIdx = sortedQuizzes.length;
              }

              const visibleQuizzesList: QuizItem[] = [];

              for (let i = 0; i < sortedQuizzes.length; i++) {
                const pq: any = sortedQuizzes[i];

                if (i < firstUnpassedIdx) {
                  visibleQuizzesList.push({
                    id: pq.id,
                    title: pq.title,
                    order: pq.order,
                    questionCount: pq.questionCount,
                    durationMinutes: pq.durationMinutes,
                    passMark: pq.passMark,
                    maxAttempts: pq.maxAttempts,
                    attemptsUsed: pq.attemptsUsed,
                    attemptsRemaining: pq.attemptsRemaining,
                    status: "PASSED",
                    latestAttemptId: pq.latestAttemptId,
                    latestScore: pq.latestScore,
                    remediationState: pq.remediationState,
                    requiredMaterials: pq.requiredMaterials,
                    allMaterialsCompleted: pq.allMaterialsCompleted,
                    reassessmentStatus: pq.reassessmentStatus,
                    highRiskWarning: pq.highRiskWarning,
                    highRiskDetails: pq.highRiskDetails,
                  });
                } else if (i === firstUnpassedIdx) {
                  let status: QuizItem["status"] = "AVAILABLE";
                  if (pq.hasInProgress) {
                    status = "IN_PROGRESS";
                  } else if (pq.attemptsUsed >= pq.maxAttempts) {
                    status = "FAILED_EXHAUSTED";
                  } else if (pq.attemptsUsed > 0) {
                    status = "FAILED_RETRYABLE";
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
                    attemptsRemaining: pq.attemptsRemaining,
                    status,
                    latestAttemptId: pq.latestAttemptId,
                    latestScore: pq.latestScore,
                    remediationState: pq.remediationState,
                    requiredMaterials: pq.requiredMaterials,
                    allMaterialsCompleted: pq.allMaterialsCompleted,
                    reassessmentStatus: pq.reassessmentStatus,
                    highRiskWarning: pq.highRiskWarning,
                    highRiskDetails: pq.highRiskDetails,
                  });
                } else if (i === firstUnpassedIdx + 1) {
                  const prevPq: any = sortedQuizzes[i - 1];
                  visibleQuizzesList.push({
                    id: pq.id,
                    title: pq.title,
                    order: pq.order,
                    questionCount: pq.questionCount,
                    durationMinutes: pq.durationMinutes,
                    passMark: pq.passMark,
                    maxAttempts: pq.maxAttempts,
                    attemptsUsed: pq.attemptsUsed,
                    attemptsRemaining: pq.attemptsRemaining,
                    status: "LOCKED",
                    lockedReason: `Complete ${prevPq.title} and pass to unlock this quiz.`,
                    previousQuizTitle: prevPq.title,
                  });
                }
              }

              if (firstUnpassedIdx < sortedQuizzes.length) {
                setActiveSectionTitle(`Quiz ${firstUnpassedIdx + 1}`);
              } else {
                setActiveSectionTitle("All Quizzes Completed!");
              }

              setQuizzes(visibleQuizzesList);
              setTotalQuizzesCount(data.total_quizzes_count ?? sortedQuizzes.length);
              setCompletedQuizzesCount(data.completed_quizzes_count ?? sortedQuizzes.filter((pq: any) => pq.isPassed).length);
              setOverallProgress(data.overall_progress_pct ?? 0);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching lesson quizzes:", err);
      }

      setQuizzes([]);
      setTotalQuizzesCount(0);
      setCompletedQuizzesCount(0);
      setOverallProgress(0);
      setLoading(false);
    };

    fetchLessonData();
  }, [lessonId, paramTerm]);

  const [startingQuizId, setStartingQuizId] = useState<number | string | null>(null);

  // Handle Start / Resume / Retake / Reassessment
  const handleStartQuiz = async (quizItem: QuizItem, isReassessment: boolean = false) => {
    if (startingQuizId) return;
    setStartingQuizId(quizItem.id);
    const token = getToken();

    if (!token) {
      alert("Authentication token missing. Please log in again.");
      setStartingQuizId(null);
      return;
    }

    try {
      const endpoint = isReassessment ? "/api/attempts/attempts/start_reassessment/" : "/api/attempts/attempts/start/";
      const startRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ quiz: quizItem.id }),
      });

      if (startRes.ok) {
        const attemptData = await startRes.json();
        navigate(
          `/student/quizzes/${quizItem.id}/attempt?termName=${encodeURIComponent(
            termName
          )}&lessonTitle=${encodeURIComponent(lessonTitle)}&lessonId=${lessonId}`,
          { state: { initialAttempt: attemptData } }
        );
      } else {
        const errData = await startRes.json().catch(() => ({}));
        alert(errData.detail || "Unable to start quiz attempt. Please complete required steps.");
      }
    } catch (err) {
      console.error("Error starting quiz attempt:", err);
      alert("Network error. Unable to connect to quiz server.");
    } finally {
      setStartingQuizId(null);
    }
  };

  // Handle View Results
  const handleViewResults = (quizItem: QuizItem) => {
    if (quizItem.latestAttemptId) {
      navigate(
        `/student/quizzes/${quizItem.id}/results/${quizItem.latestAttemptId}?termName=${encodeURIComponent(
          termName
        )}&lessonTitle=${encodeURIComponent(lessonTitle)}&lessonId=${lessonId}`,
        {
          state: {
            quiz: quizItem,
            resultSummary: {
              attemptId: quizItem.latestAttemptId,
              quizId: quizItem.id,
              quizTitle: quizItem.title,
              score: quizItem.latestScore,
              passMark: quizItem.passMark,
              status: quizItem.status,
              isPassed: quizItem.status === "PASSED",
              attemptsUsed: quizItem.attemptsUsed,
              maxAttempts: quizItem.maxAttempts,
            },
          },
        }
      );
    } else {
      handleStartQuiz(quizItem);
    }
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
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
            navigate(`/student/my-learning/term/${encodeURIComponent(termName)}/lessons`)
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
          <CardSkeleton count={3} />
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
