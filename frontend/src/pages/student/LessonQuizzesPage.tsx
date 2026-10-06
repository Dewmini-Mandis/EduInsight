import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import LessonProgressCard from "../../components/student/LessonProgressCard";
import LessonQuizCard, { QuizItem } from "../../components/student/LessonQuizCard";
import { getToken } from "../../auth/authUtils";
import { sortQuizzesByProgression } from "../../utils/quizOrdering";

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
            quizListRaw = sortQuizzesByProgression(quizListRaw);

            // Fetch remediation status for each quiz in parallel
            const remStatusPromises = quizListRaw.map((q) =>
              fetch(`/api/attempts/attempts/remediation_status/?quiz=${q.id}`, {
                headers: { Authorization: `Token ${token}` },
              })
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
            );
            const remStatuses = await Promise.all(remStatusPromises);

            // Determine status for each quiz
            const processedQuizzes = quizListRaw.map((q, idx) => {
              const passMark = q.pass_mark || 50;
              const remData = remStatuses[idx];
              const qAttempts = attemptsList.filter((att) => String(att.quiz) === String(q.id) || String(att.quiz?.id) === String(q.id));
              const ordinarySubmitted = qAttempts.filter(
                (att) => (att.attempt_type === "ORDINARY" || !att.attempt_type) && (att.status === "SUBMITTED" || att.status === "EXPIRED")
              );
              const inProgressAttempt = qAttempts.find((att) => att.status === "IN_PROGRESS");
              const passedAttempt = qAttempts.find((att) => att.score !== null && att.score >= passMark);

              const latestAtt = ordinarySubmitted[0] || qAttempts[0] || null;

              return {
                rawQuiz: q,
                id: q.id,
                title: q.title,
                order: q.order || 1,
                questionCount: q.questions ? q.questions.length : 10,
                durationMinutes: q.estimated_time_minutes || 10,
                passMark,
                maxAttempts: q.max_attempts || 3,
                attemptsUsed: remData ? remData.ordinary_attempts_used : ordinarySubmitted.length,
                attemptsRemaining: remData ? remData.ordinary_attempts_remaining : Math.max(0, (q.max_attempts || 3) - ordinarySubmitted.length),
                isPassed: remData ? remData.has_passed : !!passedAttempt,
                hasInProgress: !!inProgressAttempt,
                latestAttemptId: latestAtt ? latestAtt.id : null,
                latestScore: latestAtt ? latestAtt.score : null,

                remediationState: remData?.remediation_state || null,
                requiredMaterials: remData?.required_materials || [],
                allMaterialsCompleted: remData?.all_materials_completed || false,
                reassessmentStatus: remData?.reassessment_status || "NOT_ELIGIBLE",
                highRiskWarning: remData?.high_risk_warning || false,
                highRiskDetails: remData?.high_risk_details || null,
              };
            });

            // Find index of first unpassed quiz (active quiz step)
            let firstUnpassedIdx = processedQuizzes.findIndex((pq) => !pq.isPassed);
            if (firstUnpassedIdx === -1) {
              firstUnpassedIdx = processedQuizzes.length;
            }

            const passedCount = processedQuizzes.filter((pq) => pq.isPassed).length;
            const totalCount = processedQuizzes.length;
            const pct = Math.round((passedCount / totalCount) * 100);

            const visibleQuizzesList: QuizItem[] = [];

            for (let i = 0; i < processedQuizzes.length; i++) {
              const pq = processedQuizzes[i];

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
                  attemptsRemaining: pq.attemptsRemaining,
                  status: "LOCKED",
                  lockedReason: `Complete ${prevPq.title} and pass to unlock this quiz.`,
                  previousQuizTitle: prevPq.title,
                });
              }
            }

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
        )}&lessonTitle=${encodeURIComponent(lessonTitle)}&lessonId=${lessonId}`
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
