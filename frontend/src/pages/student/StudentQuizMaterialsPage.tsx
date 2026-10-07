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
  const [accumulatedTimes, setAccumulatedTimes] = useState<{ [materialId: number]: number }>({});
  const [watchedPercents, setWatchedPercents] = useState<{ [materialId: number]: number }>({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<number>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: number]: string }>({});

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

      // Fetch Quiz, Remediation Status, Materials, and Content Progress
      const [quizRes, remRes, materialsRes, progressRes, videoAnsRes] = await Promise.all([
        fetch(`/api/quizzes/${quizId}/`, { headers }),
        fetch(`/api/attempts/attempts/remediation_status/?quiz=${quizId}`, { headers }),
        fetch(`/api/quizzes/materials/?quiz=${quizId}`, { headers }),
        fetch(`/api/attempts/content-progress/`, { headers }),
        fetch(`/api/attempts/video-answers/`, { headers }),
      ]);

      if (quizRes.ok) {
        const qData = await quizRes.json();
        setQuizTitle(qData.title || `Quiz #${quizId}`);
      }

      const completedSet = new Set<number>();
      const initialTimes: { [materialId: number]: number } = {};
      const initialWatched: { [materialId: number]: number } = {};

      if (progressRes.ok) {
        const pData = await progressRes.json();
        const pList = Array.isArray(pData) ? pData : pData.results || [];
        pList.forEach((prog: any) => {
          if (prog.is_completed) completedSet.add(prog.material);
          if (prog.accumulated_seconds) initialTimes[prog.material] = prog.accumulated_seconds;
          if (prog.watched_percentage) initialWatched[prog.material] = prog.watched_percentage;
        });
      }

      if (remRes.ok) {
        const remData = await remRes.json();
        const reqMats = remData.required_materials || [];
        reqMats.forEach((m: any) => {
          if (m.is_completed) completedSet.add(m.id);
        });
      }

      const answeredQSet = new Set<number>();
      if (videoAnsRes.ok) {
        const vaData = await videoAnsRes.json();
        const vaList = Array.isArray(vaData) ? vaData : vaData.results || [];
        vaList.forEach((va: any) => {
          answeredQSet.add(va.question);
        });
      }
      setAnsweredQuestionIds(answeredQSet);

      let fetchedMaterials: LearningMaterialItem[] = [];
      if (materialsRes.ok) {
        const matData = await materialsRes.json();
        fetchedMaterials = Array.isArray(matData) ? matData : matData.results || [];
      }

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
        setAnsweredQuestionIds((prev) => new Set(prev).add(vqId));
      }
    } catch (e) {
      console.error("Error submitting video answer:", e);
    }
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (!activeMaterial) return;
    const video = e.currentTarget;
    if (!video.duration || isNaN(video.duration)) return;

    const pct = Math.floor((video.currentTime / video.duration) * 100);
    setWatchedPercents((prev) => {
      const current = prev[activeMaterial.id] || 0;
      if (pct > current) {
        return { ...prev, [activeMaterial.id]: pct };
      }
      return prev;
    });
  };

  const markMaterialComplete = async (materialId: number) => {
    if (completedMaterialIds.has(materialId) || markingCompletion) return;
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
        <div style={{ padding: "60px", textAlign: "center", color: "#5D78A3", fontSize: "16px" }}>
          Loading recommended learning materials...
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
                        src={activeMaterial.file}
                        controls
                        onTimeUpdate={handleVideoTimeUpdate}
                        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                      />
                    </div>

                    {/* Embedded Video Questions Checkpoints */}
                    {activeMaterial.video_questions && activeMaterial.video_questions.length > 0 && (
                      <div
                        style={{
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #DCE6F3",
                          borderRadius: "12px",
                          padding: "20px",
                          marginTop: "20px",
                        }}
                      >
                        <h4 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                          Embedded Video Questions ({activeMaterial.video_questions.length})
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {activeMaterial.video_questions.map((vq: any, i: number) => {
                            const isAnswered = answeredQuestionIds.has(vq.id);
                            return (
                              <div
                                key={vq.id || i}
                                style={{
                                  backgroundColor: "#FFFFFF",
                                  border: isAnswered ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                                  borderRadius: "10px",
                                  padding: "16px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "12px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#126BFF", marginRight: "10px" }}>
                                      Timestamp: {Math.floor(vq.timestamp / 60)}:{String(Math.floor(vq.timestamp % 60)).padStart(2, "0")}
                                    </span>
                                    <span style={{ fontSize: "15px", color: "#0B1F3A", fontWeight: "600" }}>
                                      {vq.question_text}
                                    </span>
                                  </div>
                                  {isAnswered ? (
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#16A34A", backgroundColor: "#DCFCE7", padding: "4px 10px", borderRadius: "12px" }}>
                                      Answered ✓
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#5D78A3", backgroundColor: "#F1F5F9", padding: "3px 8px", borderRadius: "4px" }}>
                                      Required
                                    </span>
                                  )}
                                </div>

                                {!isAnswered && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                                    {(vq.options || []).map((opt: any, optIdx: number) => {
                                      const optText = typeof opt === "string" ? opt : opt.text;
                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() => handleAnswerVideoQuestion(vq.id, optText)}
                                          style={{
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #DCE6F3",
                                            backgroundColor: "#F8FAFC",
                                            color: "#0B1F3A",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                          }}
                                          onMouseEnter={(e: any) => (e.currentTarget.style.borderColor = "#126BFF")}
                                          onMouseLeave={(e: any) => (e.currentTarget.style.borderColor = "#DCE6F3")}
                                        >
                                          {optText}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
