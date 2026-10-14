import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  Play,
  Download,
  Target,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Lock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import { getToken } from "../../auth/authUtils";
import { queryClient } from "../../api/queryClient";
import { CardSkeleton } from "../../components/common/Skeletons";
import "../../styles/student.css";

interface MaterialAttachmentItem {
  id: number;
  file: string;
  attachment_type: string;
}

interface VideoQuestionItem {
  id: number;
  timestamp: number;
  question_type: string;
  question_text: string;
  options: any[];
}

interface LearningMaterialItem {
  id: number;
  title: string;
  material_type: "VIDEO" | "PDF" | "TEXT";
  content?: string;
  file?: string;
  estimated_completion_minutes?: number;
  skill?: number | { id: number; name: string };
  skill_name?: string;
  order?: number;
  attachments?: MaterialAttachmentItem[];
  video_questions?: VideoQuestionItem[];
  engagement_questions?: any[];
  is_completed?: boolean;
}

interface GroupedSkillMaterials {
  skillId: number;
  skillName: string;
  materials: LearningMaterialItem[];
}

const StudentQuizMaterialsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Lesson Quiz";
  const lessonIdParam = searchParams.get("lessonId") || "";

  const [quizTitle, setQuizTitle] = useState<string>("Quiz Recommended Materials");
  const [groupedMaterials, setGroupedMaterials] = useState<GroupedSkillMaterials[]>([]);
  const [allMaterials, setAllMaterials] = useState<LearningMaterialItem[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<LearningMaterialItem | null>(null);
  const [completedMaterialIds, setCompletedMaterialIds] = useState<Set<number>>(new Set());

  // Time & Video Tracking States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [accumulatedTimes, setAccumulatedTimes] = useState<{ [materialId: number]: number }>({});
  const [watchedPercents, setWatchedPercents] = useState<{ [materialId: number]: number }>({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<number>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: number]: string }>({});

  // Active Timed Question Modal States
  const [activeTimedQuestion, setActiveTimedQuestion] = useState<VideoQuestionItem | null>(null);
  const [timedQuestionState, setTimedQuestionState] = useState<"IDLE" | "OPEN" | "INCORRECT" | "CORRECT">("IDLE");
  const [selectedOptionText, setSelectedOptionText] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [startingRetry, setStartingRetry] = useState<boolean>(false);
  const [markingCompletion, setMarkingCompletion] = useState<number | null>(null);

  // Active Learning Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRecommendedMaterials();
  }, [quizId]);

  const fetchRecommendedMaterials = async () => {
    setLoading(true);
    setError(null);
    const token = getToken();

    if (!token) {
      setError("User authentication token not found.");
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Token ${token}` };

      const data = await queryClient.fetchQuery(
        ["student", "remediation-summary", quizId],
        async () => {
          const res = await fetch(`/api/attempts/attempts/remediation_summary/?quiz=${quizId}`, { headers });
          return res.ok ? await res.json() : null;
        },
        { staleTime: 30000 }
      );

      if (!data) {
        throw new Error("Unable to fetch remediation data.");
      }

      const qData = data.quiz;
      const remData = data.remediation_status;
      const fetchedMaterials: LearningMaterialItem[] = data.materials || [];
      const answeredVqIds: number[] = data.answered_video_question_ids || [];

      if (qData) {
        setQuizTitle(qData.title || `Quiz #${quizId}`);
      }

      const completedSet = new Set<number>();
      const initialTimes: { [materialId: number]: number } = {};
      const initialWatched: { [materialId: number]: number } = {};

      if (remData) {
        const reqMats = remData.required_materials || [];
        reqMats.forEach((m: any) => {
          if (m.is_completed) completedSet.add(m.id);
        });
      }

      const answeredQSet = new Set<number>(answeredVqIds);
      setAnsweredQuestionIds(answeredQSet);

      // Group materials by covered skills
      const skillMap = new Map<number, { skillName: string; materials: LearningMaterialItem[] }>();

      fetchedMaterials.forEach((mat) => {
        const sId = typeof mat.skill === "object" ? mat.skill?.id : mat.skill || 0;
        const sName = mat.skill_name || (typeof mat.skill === "object" ? mat.skill?.name : "") || `Skill #${sId}`;

        if (!skillMap.has(sId)) {
          skillMap.set(sId, { skillName: sName, materials: [] });
        }
        skillMap.get(sId)!.materials.push({
          ...mat,
          is_completed: completedSet.has(mat.id),
        });
      });

      const grouped: GroupedSkillMaterials[] = Array.from(skillMap.entries()).map(([sId, val]) => ({
        skillId: sId,
        skillName: val.skillName,
        materials: val.materials,
      }));

      setGroupedMaterials(grouped);
      setAllMaterials(fetchedMaterials);
      setCompletedMaterialIds(completedSet);
      setAccumulatedTimes(initialTimes);
      setWatchedPercents(initialWatched);

      if (fetchedMaterials.length > 0) {
        setActiveMaterial(fetchedMaterials[0]);
      }
    } catch (err: any) {
      console.error("Error loading recommended materials:", err);
      setError(err.message || "Failed to load recommended learning materials.");
    } finally {
      setLoading(false);
    }
  };

  // Active Learning Timer: Only increments when browser tab is visible & window has focus
  useEffect(() => {
    if (!activeMaterial || completedMaterialIds.has(activeMaterial.id)) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (activeMaterial.material_type !== "VIDEO") {
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible" && document.hasFocus()) {
          setAccumulatedTimes((prev) => {
            const current = prev[activeMaterial.id] || 0;
            return { ...prev, [activeMaterial.id]: current + 1 };
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeMaterial, completedMaterialIds]);

  // Periodic Backend Sync (Heartbeat) every 10 seconds
  useEffect(() => {
    if (!activeMaterial || completedMaterialIds.has(activeMaterial.id)) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    heartbeatRef.current = setInterval(() => {
      syncProgressToBackend(activeMaterial.id);
    }, 10000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [activeMaterial, accumulatedTimes, watchedPercents]);

  const syncProgressToBackend = async (matId: number) => {
    const token = getToken();
    if (!token) return;

    const currentAcc = accumulatedTimes[matId] || 0;
    const currentWatched = watchedPercents[matId] || 0;

    try {
      await fetch("/api/attempts/content-progress/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          material: matId,
          accumulated_seconds: currentAcc,
          watched_percentage: currentWatched,
          is_completed: false,
        }),
      });
    } catch (e) {
      console.error("Heartbeat sync failed:", e);
    }
  };

  const handleAnswerVideoQuestion = async (vqId: number, optionText: string) => {
    const token = getToken();
    if (!token || !optionText) return;

    setSelectedAnswers((prev) => ({ ...prev, [vqId]: optionText }));

    try {
      const res = await fetch("/api/attempts/video-answers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          question: vqId,
          selected_answer: optionText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_correct) {
          setAnsweredQuestionIds((prev) => new Set(prev).add(vqId));
        }
      }
    } catch (e) {
      console.error("Error submitting video answer:", e);
    }
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (!activeMaterial) return;
    const video = e.currentTarget;
    if (!video.duration || isNaN(video.duration)) return;

    const currentTime = video.currentTime;
    const pct = Math.floor((currentTime / video.duration) * 100);
    setWatchedPercents((prev) => {
      const current = prev[activeMaterial.id] || 0;
      return pct > current ? { ...prev, [activeMaterial.id]: pct } : prev;
    });

    // Check Timed Video Questions
    if (
      activeMaterial.material_type === "VIDEO" &&
      activeMaterial.video_questions &&
      activeMaterial.video_questions.length > 0
    ) {
      // Sort questions by timestamp ascending
      const sortedQs = [...activeMaterial.video_questions].sort((a, b) => a.timestamp - b.timestamp);

      // Seek protection & Timestamp Trigger:
      // Find the earliest unanswered question whose timestamp is <= currentTime (or was passed)
      const unansweredQ = sortedQs.find(
        (vq) => !answeredQuestionIds.has(vq.id) && currentTime >= vq.timestamp
      );

      if (unansweredQ) {
        if (!activeTimedQuestion || activeTimedQuestion.id !== unansweredQ.id) {
          video.pause();
          // Snap back to question timestamp if seeked far past it
          if (currentTime - unansweredQ.timestamp > 1.0) {
            video.currentTime = unansweredQ.timestamp;
          }
          setActiveTimedQuestion(unansweredQ);
          setTimedQuestionState("OPEN");
          setSelectedOptionText(null);
          setFeedbackMsg("");
        } else {
          // If modal is currently open or incorrect, ensure video STAYS PAUSED
          if (timedQuestionState !== "IDLE" && !video.paused) {
            video.pause();
          }
        }
      }
    }
  };

  const handleSubmitTimedAnswer = async () => {
    if (!activeTimedQuestion || !selectedOptionText || submittingAnswer) return;
    const token = getToken();
    if (!token) return;

    setSubmittingAnswer(true);
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/attempts/video-answers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          question: activeTimedQuestion.id,
          selected_answer: selectedOptionText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_correct) {
          // CORRECT ANSWER FLOW
          setTimedQuestionState("CORRECT");
          setFeedbackMsg("Correct answer! Resuming video...");

          setAnsweredQuestionIds((prev) => new Set(prev).add(activeTimedQuestion.id));

          setTimeout(() => {
            setTimedQuestionState("IDLE");
            setActiveTimedQuestion(null);
            setSelectedOptionText(null);
            setFeedbackMsg("");
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }, 1000);
        } else {
          // WRONG ANSWER FLOW - Keep video PAUSED!
          setTimedQuestionState("INCORRECT");
          setFeedbackMsg("Incorrect answer. Click Retry to try again.");
          // DO NOT CALL video.play()!
        }
      } else {
        setFeedbackMsg("Failed to submit answer. Please try again.");
      }
    } catch (e) {
      console.error("Error submitting video answer:", e);
      setFeedbackMsg("Network error while submitting answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleRetryTimedQuestion = () => {
    setSelectedOptionText(null);
    setFeedbackMsg("");
    setTimedQuestionState("OPEN");
    // Video remains PAUSED!
  };

  const markMaterialComplete = async (materialId: number) => {
    if (completedMaterialIds.has(materialId) || markingCompletion) return;

    const matObj = allMaterials.find((m) => m.id === materialId) || activeMaterial;
    if (matObj && matObj.material_type === "VIDEO" && matObj.video_questions && matObj.video_questions.length > 0) {
      const allQsAnswered = matObj.video_questions.every((vq) => answeredQuestionIds.has(vq.id));
      if (!allQsAnswered) {
        setCompletionError("Please answer all embedded video questions correctly before marking this material as completed.");
        return;
      }
    }

    setMarkingCompletion(materialId);
    setCompletionError(null);
    const token = getToken();

    const currentAcc = accumulatedTimes[materialId] || 0;
    const currentWatched = watchedPercents[materialId] || 0;

    try {
      const res = await fetch("/api/attempts/content-progress/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          material: materialId,
          accumulated_seconds: currentAcc,
          watched_percentage: currentWatched,
          is_completed: true,
        }),
      });

      if (res.ok) {
        const newSet = new Set(completedMaterialIds);
        newSet.add(materialId);
        setCompletedMaterialIds(newSet);

        setAllMaterials((prev) =>
          prev.map((m) => (m.id === materialId ? { ...m, is_completed: true } : m))
        );
        setGroupedMaterials((prev) =>
          prev.map((g) => ({
            ...g,
            materials: g.materials.map((m) => (m.id === materialId ? { ...m, is_completed: true } : m)),
          }))
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        setCompletionError(
          errData.detail || "Please complete the required learning requirements before marking as complete."
        );
      }
    } catch (err: any) {
      console.error("Error saving material progress:", err);
      setCompletionError("Network error while completing material.");
    } finally {
      setMarkingCompletion(null);
    }
  };

  const allCompleted = allMaterials.length === 0 || allMaterials.every((m) => completedMaterialIds.has(m.id));

  const handleRetryQuiz = async () => {
    if (startingRetry) return;
    setStartingRetry(true);
    const token = getToken();

    try {
      const startRes = await fetch("/api/attempts/attempts/start/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ quiz: quizId }),
      });

      if (startRes.ok) {
        const attemptData = await startRes.json();
        navigate(
          `/student/quizzes/${quizId}/attempt?termName=${encodeURIComponent(
            termName
          )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`,
          { state: { initialAttempt: attemptData } }
        );
      } else {
        const reassessRes = await fetch("/api/attempts/attempts/start_reassessment/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ quiz: quizId }),
        });

        if (reassessRes.ok) {
          const attemptData = await reassessRes.json();
          navigate(
            `/student/quizzes/${quizId}/attempt?termName=${encodeURIComponent(
              termName
            )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`,
            { state: { initialAttempt: attemptData } }
          );
        } else {
          const errData = await reassessRes.json().catch(() => ({}));
          alert(errData.detail || "Unable to start quiz retry attempt.");
        }
      }
    } catch (err) {
      console.error("Error retrying quiz:", err);
      alert("Network error starting retry attempt.");
    } finally {
      setStartingRetry(false);
    }
  };

  const formatMMSS = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
    { label: lessonTitleParam, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}` },
    { label: "Recommended Materials" },
  ];

  if (loading) {
    return (
      <div className="student-full-page-container">
        <Breadcrumbs items={breadcrumbsList} />
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <CardSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="student-full-page-container" style={{ paddingBottom: "80px" }}>
      <Breadcrumbs items={breadcrumbsList} />

      {/* 1. Header Card (NO ICON before "Remedial Materials Review", spacing adjusted) */}
      <div
        className="student-card"
        style={{
          padding: "24px 28px",
          borderLeft: allCompleted ? "4px solid #16B978" : "4px solid #126BFF",
          backgroundColor: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0B1F3A", lineHeight: 1.2 }}>
            Remedial Materials Review
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3" }}>
            {allCompleted
              ? "All recommended materials completed. You're ready to reassess your understanding."
              : `${completedMaterialIds.size} of ${allMaterials.length} materials completed. Review all items to prepare for your retry.`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="student-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back to Quiz Results
          </button>

          {allCompleted && (
            <button
              type="button"
              className="student-btn-primary"
              style={{ height: "42px", padding: "0 22px" }}
              onClick={handleRetryQuiz}
              disabled={startingRetry}
            >
              <RefreshCw size={16} />
              {startingRetry ? "Starting Retry..." : "Attempt Reassessment"}
            </button>
          )}
        </div>
      </div>

      {completionError && (
        <div
          style={{
            backgroundColor: "#FDEDED",
            color: "#FF4054",
            padding: "14px 20px",
            borderRadius: "12px",
            border: "1px solid #FADCDC",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <AlertCircle size={18} />
          {completionError}
        </div>
      )}

      {/* 2. Main Materials Layout (Stepper + Expanded Material View Cards) */}
      {allMaterials.length === 0 ? (
        <div className="student-card" style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
          <p style={{ fontSize: "16px", margin: "0 0 12px", color: "#0B1F3A", fontWeight: "600" }}>
            No specific learning materials are assigned for the skills in this quiz.
          </p>
          <p style={{ fontSize: "14px", margin: "0 0 20px" }}>
            You can proceed directly to retry the quiz.
          </p>
          <button
            type="button"
            className="student-btn-primary"
            onClick={handleRetryQuiz}
          >
            Attempt Reassessment Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Skill Groups & Material Stepper Header */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {groupedMaterials.map((group) => (
              <div key={group.skillId} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Target size={16} color="#126BFF" />
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#0B1F3A" }}>
                    Skill: {group.skillName}
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>
                    ({group.materials.length} {group.materials.length === 1 ? "Material" : "Materials"})
                  </span>
                </div>

                {(() => {
                  const count = group.materials.length;
                  const gridClass = count <= 1
                    ? "material-dynamic-grid material-dynamic-grid-1"
                    : count === 2
                      ? "material-dynamic-grid material-dynamic-grid-2"
                      : "material-dynamic-grid material-dynamic-grid-3";
                  const inlineGridCols = count <= 1
                    ? "1fr"
                    : count === 2
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(3, minmax(0, 1fr))";

                  return (
                    <div
                      className={gridClass}
                      style={{
                        display: "grid",
                        gridTemplateColumns: inlineGridCols,
                        gap: "14px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {group.materials.map((mat, idx) => {
                        const isSelected = activeMaterial?.id === mat.id;
                        const isDone = completedMaterialIds.has(mat.id);
                        const typeLabel = mat.material_type === "VIDEO" ? "Video" : mat.material_type === "PDF" ? "PDF Document" : "Note";

                        return (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => {
                              setActiveMaterial(mat);
                              setCompletionError(null);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "14px 18px",
                              borderRadius: "12px",
                              border: isSelected ? "2px solid #126BFF" : "1px solid #DCE6F3",
                              backgroundColor: isSelected ? "#F0F6FF" : "#FFFFFF",
                              color: isSelected ? "#126BFF" : "#0B1F3A",
                              cursor: "pointer",
                              width: "100%",
                              minWidth: 0,
                              height: "100%",
                              transition: "all 0.15s ease",
                              boxShadow: isSelected ? "0 4px 12px rgba(18, 107, 255, 0.12)" : "none",
                              boxSizing: "border-box",
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: isDone ? "#E9FBF4" : isSelected ? "#126BFF" : "#EFF6FF",
                                color: isDone ? "#16B978" : isSelected ? "#FFFFFF" : "#126BFF",
                                fontSize: "12px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: isSelected ? "#126BFF" : "#5D78A3", letterSpacing: "0.5px" }}>
                                {typeLabel}
                              </span>
                              <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#0B1F3A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                                {mat.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* 3. Expanded Full-Width Material View Card (Matches Teacher Student Preview) */}
          {activeMaterial && (
            <div
              style={{
                width: "100%",
                backgroundColor: "#FFFFFF",
                padding: "24px 28px",
                borderRadius: "16px",
                border: "1px solid #E4ECF6",
                boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
                minHeight: "500px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div>
                {/* Title & Material Metadata */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid #E4ECF6",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          backgroundColor: activeMaterial.material_type === "VIDEO" ? "#F1EDFF" : "#EAF3FF",
                          color: activeMaterial.material_type === "VIDEO" ? "#6C4BFF" : "#126BFF",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {activeMaterial.material_type}
                      </span>
                      <span style={{ fontSize: "13px", color: "#5D78A3" }}>
                        Skill: {activeMaterial.skill_name || "Quiz Skill"}
                      </span>
                    </div>

                    <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#0B1F3A", margin: "8px 0 0 0" }}>
                      {activeMaterial.title}
                    </h2>

                    {/* Estimated Completion Time display (Positioned below title and above content) */}
                    {activeMaterial.material_type !== "VIDEO" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#475569",
                          marginTop: "8px",
                        }}
                      >
                        <Clock size={16} color="#126BFF" />
                        <span style={{ color: "#5D78A3", fontWeight: "500" }}>Estimated Completion Time:</span>
                        <strong style={{ color: "#0B1F3A" }}>
                          {activeMaterial.estimated_completion_minutes || 5} minutes
                        </strong>
                      </div>
                    )}
                  </div>

                  {completedMaterialIds.has(activeMaterial.id) && (
                    <span
                      style={{
                        backgroundColor: "#E9FBF4",
                        color: "#16B978",
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle2 size={16} /> Completed ✓
                    </span>
                  )}
                </div>

                {/* Material Content Rendering */}
                {activeMaterial.material_type === "VIDEO" ? (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16 / 9",
                        maxHeight: "560px",
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "20px",
                      }}
                    >
                      <video
                        ref={videoRef}
                        src={activeMaterial.file}
                        controls
                        onTimeUpdate={handleVideoTimeUpdate}
                        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                      />

                      {/* Timed Question Modal Overlay */}
                      {timedQuestionState !== "IDLE" && activeTimedQuestion && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(11, 31, 58, 0.88)",
                            zIndex: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "24px",
                            boxSizing: "border-box",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#FFFFFF",
                              borderRadius: "16px",
                              padding: "24px",
                              maxWidth: "520px",
                              width: "100%",
                              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "#126BFF", backgroundColor: "#EFF6FF", padding: "4px 12px", borderRadius: "20px" }}>
                                Checkpoint at {Math.floor(activeTimedQuestion.timestamp / 60)}:{String(Math.floor(activeTimedQuestion.timestamp % 60)).padStart(2, "0")}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748B" }}>
                                {activeTimedQuestion.question_type || "Question"}
                              </span>
                            </div>

                            <h3 style={{ margin: "4px 0 0 0", fontSize: "17px", fontWeight: "700", color: "#0B1F3A", lineHeight: "1.4" }}>
                              {activeTimedQuestion.question_text}
                            </h3>

                            {/* Options List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                              {(activeTimedQuestion.options || []).map((opt: any, optIdx: number) => {
                                const optText = typeof opt === "string" ? opt : opt.text;
                                const isSelected = selectedOptionText === optText;
                                const isDisabled = timedQuestionState === "INCORRECT" || timedQuestionState === "CORRECT" || submittingAnswer;

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => setSelectedOptionText(optText)}
                                    style={{
                                      padding: "12px 16px",
                                      borderRadius: "10px",
                                      border: isSelected ? "2px solid #126BFF" : "1px solid #DCE6F3",
                                      backgroundColor: isSelected ? "#F0F6FF" : "#F8FAFC",
                                      color: isSelected ? "#126BFF" : "#0B1F3A",
                                      fontSize: "14px",
                                      fontWeight: isSelected ? "600" : "500",
                                      textAlign: "left",
                                      cursor: isDisabled ? "default" : "pointer",
                                      transition: "all 0.15s ease",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span>{optText}</span>
                                    {isSelected && <span style={{ fontWeight: "700" }}>✓</span>}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Feedback Banner */}
                            {feedbackMsg && (
                              <div
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  backgroundColor: timedQuestionState === "CORRECT" ? "#DCFCE7" : "#FEE2E2",
                                  color: timedQuestionState === "CORRECT" ? "#15803D" : "#DC2626",
                                  border: timedQuestionState === "CORRECT" ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                                }}
                              >
                                {feedbackMsg}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                              {timedQuestionState === "INCORRECT" ? (
                                <button
                                  type="button"
                                  onClick={handleRetryTimedQuestion}
                                  style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    backgroundColor: "#126BFF",
                                    color: "#FFFFFF",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 6px rgba(18, 107, 255, 0.3)",
                                  }}
                                >
                                  Retry Question
                                </button>
                              ) : timedQuestionState === "OPEN" ? (
                                <button
                                  type="button"
                                  disabled={!selectedOptionText || submittingAnswer}
                                  onClick={handleSubmitTimedAnswer}
                                  style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    backgroundColor: !selectedOptionText || submittingAnswer ? "#94A3B8" : "#126BFF",
                                    color: "#FFFFFF",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    border: "none",
                                    cursor: !selectedOptionText || submittingAnswer ? "not-allowed" : "pointer",
                                    boxShadow: !selectedOptionText || submittingAnswer ? "none" : "0 2px 6px rgba(18, 107, 255, 0.3)",
                                  }}
                                >
                                  {submittingAnswer ? "Submitting..." : "Submit Answer"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      padding: "24px",
                      backgroundColor: "#F8FAFC",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      minHeight: "260px",
                      fontSize: "15.5px",
                      lineHeight: "1.7",
                      color: "#1E293B",
                      boxSizing: "border-box",
                    }}
                  >
                    {activeMaterial.content ? (
                      <div dangerouslySetInnerHTML={{ __html: activeMaterial.content }} />
                    ) : (
                      <p style={{ color: "#94A3B8", fontStyle: "italic" }}>No text content written for this note.</p>
                    )}

                    {/* Attachments / Document Viewer */}
                    {activeMaterial.attachments && activeMaterial.attachments.length > 0 && (
                      <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #E2E8F0" }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                          Attachments & Documents ({activeMaterial.attachments.length})
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {activeMaterial.attachments.map((att: any) => (
                            <a
                              key={att.id}
                              href={att.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 16px",
                                backgroundColor: "#FFFFFF",
                                border: "1px solid #DCE6F3",
                                borderRadius: "10px",
                                color: "#126BFF",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: "600",
                              }}
                            >
                              <Download size={18} />
                              {att.file.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mark as Complete Button positioned at the VERY BOTTOM of material card */}
              {(() => {
                const isCompleted = completedMaterialIds.has(activeMaterial.id);
                if (isCompleted) {
                  return (
                    <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E4ECF6" }}>
                      <button
                        type="button"
                        disabled
                        style={{
                          width: "100%",
                          height: "48px",
                          borderRadius: "10px",
                          backgroundColor: "#E9FBF4",
                          color: "#16B978",
                          border: "1px solid #BBF7D0",
                          fontSize: "15px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          cursor: "default",
                        }}
                      >
                        <CheckCircle2 size={20} />
                        Completed ✓
                      </button>
                    </div>
                  );
                }

                if (activeMaterial.material_type === "VIDEO") {
                  const watchedPct = watchedPercents[activeMaterial.id] || 0;
                  const totalVideoQs = activeMaterial.video_questions?.length || 0;
                  const answeredCount = (activeMaterial.video_questions || []).filter((vq) =>
                    answeredQuestionIds.has(vq.id)
                  ).length;

                  const canCompleteVideo = watchedPct >= 95 && answeredCount >= totalVideoQs;

                  return (
                    <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E4ECF6", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#5D78A3", fontWeight: "600" }}>
                        <span>Video Watched: <strong>{watchedPct}%</strong></span>
                        {totalVideoQs > 0 && (
                          <span>Embedded Questions: <strong>{answeredCount}/{totalVideoQs} completed</strong></span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => markMaterialComplete(activeMaterial.id)}
                        disabled={!canCompleteVideo || markingCompletion === activeMaterial.id}
                        style={{
                          width: "100%",
                          height: "48px",
                          borderRadius: "10px",
                          backgroundColor: canCompleteVideo ? "#126BFF" : "#F1F5F9",
                          color: canCompleteVideo ? "#FFFFFF" : "#94A3B8",
                          border: canCompleteVideo ? "none" : "1px solid #E2E8F0",
                          fontSize: "15px",
                          fontWeight: "700",
                          cursor: canCompleteVideo ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <CheckSquare size={18} />
                        {markingCompletion === activeMaterial.id ? "Saving..." : "Mark as Complete"}
                      </button>

                      <span style={{ fontSize: "12px", color: canCompleteVideo ? "#16A34A" : "#64748B", textAlign: "center" }}>
                        {canCompleteVideo
                          ? "Ready to mark as complete."
                          : "Finish watching the video and answer all embedded questions."}
                      </span>
                    </div>
                  );
                }

                // Note / Attachment Time Restriction
                const reqMinutes = activeMaterial.estimated_completion_minutes || 5;
                const reqSeconds = reqMinutes * 60;
                const accSeconds = accumulatedTimes[activeMaterial.id] || 0;
                const remainingSeconds = Math.max(0, reqSeconds - accSeconds);
                const canCompleteNote = accSeconds >= reqSeconds;

                return (
                  <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E4ECF6", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => markMaterialComplete(activeMaterial.id)}
                      disabled={!canCompleteNote || markingCompletion === activeMaterial.id}
                      style={{
                        width: "100%",
                        height: "48px",
                        borderRadius: "10px",
                        backgroundColor: canCompleteNote ? "#126BFF" : "#F1F5F9",
                        color: canCompleteNote ? "#FFFFFF" : "#94A3B8",
                        border: canCompleteNote ? "none" : "1px solid #E2E8F0",
                        fontSize: "15px",
                        fontWeight: "700",
                        cursor: canCompleteNote ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <CheckSquare size={18} />
                      {markingCompletion === activeMaterial.id ? "Saving..." : "Mark as Complete"}
                    </button>

                    <span style={{ fontSize: "12.5px", color: canCompleteNote ? "#16A34A" : "#64748B", textAlign: "center" }}>
                      {canCompleteNote
                        ? "Ready to mark as complete."
                        : `Mark as Complete will be available in ${formatMMSS(remainingSeconds)}.`}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentQuizMaterialsPage;
