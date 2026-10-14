import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  FileText,
  AlertCircle,
  HelpCircle,
  BarChart2,
} from "lucide-react";
import ProgressHeader from "../../components/student/progress/ProgressHeader";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

interface RemediationRaw {
  id: number;
  skill_name?: string;
  material_title?: string;
  material_type?: string;
  lesson_title?: string;
  status: "REQUIRED" | "COMPLETED";
  assigned_at: string;
  completed_at?: string;
}

interface QuizAttemptRaw {
  id: number;
  quiz: number;
  quiz_title?: string;
  lesson_title?: string;
  attempt_number: number;
  attempt_type?: "ORDINARY" | "REASSESSMENT";
  status: string;
  score: number | null;
  start_time: string;
  end_time?: string;
}

interface QuizRaw {
  id: number;
  title: string;
  pass_mark: number;
  lesson_title?: string;
}

interface RemedialCycleRecord {
  quizId: number;
  quizTitle: string;
  lessonTitle: string;
  skills: string[];
  baselineAttempt: QuizAttemptRaw | null;
  retryAttempt: QuizAttemptRaw | null;
  reassessmentAttempt: QuizAttemptRaw | null;
  remediations: RemediationRaw[];
  assignedCount: number;
  completedCount: number;
  isRemediationComplete: boolean;
  baselineScore: number | null;
  reassessmentScore: number | null;
  scoreDiff: number | null; // percentage points
}

const LearningImprovementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const quizFilterParam = searchParams.get("quiz");
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [cycles, setCycles] = useState<RemedialCycleRecord[]>([]);

  useEffect(() => {
    fetchImprovementData();
  }, [quizFilterParam]);

  const fetchImprovementData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers = { Authorization: `Token ${token}` };

      const [remediationsRes, attemptsRes, quizzesRes] = await Promise.all([
        fetch("/api/recommendations/remediations/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/quizzes/", { headers }),
      ]);

      if (!remediationsRes.ok || !attemptsRes.ok) {
        throw new Error("Failed to load remedial history.");
      }

      const rawRemediationsData = await remediationsRes.json();
      const remediationsData: RemediationRaw[] = Array.isArray(rawRemediationsData)
        ? rawRemediationsData
        : rawRemediationsData?.results || [];

      const rawAttemptsData = await attemptsRes.json();
      const attemptsData: QuizAttemptRaw[] = Array.isArray(rawAttemptsData)
        ? rawAttemptsData
        : rawAttemptsData?.results || [];

      const rawQuizzesData = quizzesRes.ok ? await quizzesRes.json() : [];
      const quizzesData: QuizRaw[] = Array.isArray(rawQuizzesData)
        ? rawQuizzesData
        : rawQuizzesData?.results || [];

      const quizMap = new Map<number, QuizRaw>();
      quizzesData.forEach((q) => quizMap.set(q.id, q));

      // Group attempts by quiz ID
      const attemptsByQuiz = new Map<number, QuizAttemptRaw[]>();
      attemptsData.forEach((att) => {
        const list = attemptsByQuiz.get(att.quiz) || [];
        list.push(att);
        attemptsByQuiz.set(att.quiz, list);
      });

      // Find quizzes with failed attempts or assigned remediations
      const relevantQuizIds = new Set<number>();
      attemptsByQuiz.forEach((attList, qId) => {
        const hasFailed = attList.some(
          (a) =>
            (!a.attempt_type || a.attempt_type === "ORDINARY") &&
            (a.status === "SUBMITTED" || a.status === "EXPIRED") &&
            (a.score ?? 0) < (quizMap.get(qId)?.pass_mark ?? 60)
        );
        const hasReassessment = attList.some((a) => a.attempt_type === "REASSESSMENT");
        if (hasFailed || hasReassessment) {
          relevantQuizIds.add(qId);
        }
      });

      if (quizFilterParam) {
        const filterId = parseInt(quizFilterParam, 10);
        if (!isNaN(filterId)) {
          relevantQuizIds.clear();
          relevantQuizIds.add(filterId);
        }
      }

      const compiledCycles: RemedialCycleRecord[] = [];

      relevantQuizIds.forEach((qId) => {
        const quizObj = quizMap.get(qId);
        const qAttempts = attemptsByQuiz.get(qId) || [];
        const title = quizObj?.title || qAttempts[0]?.quiz_title || `Quiz #${qId}`;
        const lessonTitle = quizObj?.lesson_title || qAttempts[0]?.lesson_title || "General Lesson";

        const ordinaryFinalized = qAttempts
          .filter(
            (a) =>
              (!a.attempt_type || a.attempt_type === "ORDINARY") &&
              (a.status === "SUBMITTED" || a.status === "EXPIRED")
          )
          .sort((a, b) => a.attempt_number - b.attempt_number);

        const baselineAttempt = ordinaryFinalized[0] || null;
        const retryAttempt = ordinaryFinalized.length > 1 ? ordinaryFinalized[1] : null;

        const reassessmentAttempt =
          qAttempts.find(
            (a) =>
              a.attempt_type === "REASSESSMENT" &&
              (a.status === "SUBMITTED" || a.status === "EXPIRED")
          ) || null;

        // Filter remediations matching this quiz / lesson
        const matchedRemediations = remediationsData.filter(
          (r) => !r.lesson_title || r.lesson_title === lessonTitle
        );

        const assignedCount = matchedRemediations.length;
        const completedCount = matchedRemediations.filter((r) => r.status === "COMPLETED").length;
        const isRemediationComplete = assignedCount > 0 && completedCount === assignedCount;

        const skillsSet = new Set<string>();
        matchedRemediations.forEach((r) => {
          if (r.skill_name) skillsSet.add(r.skill_name);
        });

        const baselineScore = baselineAttempt ? baselineAttempt.score : null;
        const reassessmentScore = reassessmentAttempt ? reassessmentAttempt.score : null;
        const scoreDiff =
          reassessmentScore !== null && baselineScore !== null
            ? Math.round((reassessmentScore - baselineScore) * 10) / 10
            : null;

        compiledCycles.push({
          quizId: qId,
          quizTitle: title,
          lessonTitle,
          skills: Array.from(skillsSet),
          baselineAttempt,
          retryAttempt,
          reassessmentAttempt,
          remediations: matchedRemediations,
          assignedCount,
          completedCount,
          isRemediationComplete,
          baselineScore,
          reassessmentScore,
          scoreDiff,
        });
      });

      setCycles(compiledCycles);
    } catch (err: any) {
      console.error("Error loading learning improvement history:", err);
      setError(err.message || "Failed to load learning improvement history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1280px", margin: "0 auto" }}>
      <button
        type="button"
        className="student-btn-secondary"
        style={{
          marginBottom: "16px",
          padding: "6px 12px",
          fontSize: "13px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
        onClick={() => navigate("/student/progress")}
      >
        <ArrowLeft size={16} />
        <span>Back to My Progress</span>
      </button>

      <ProgressHeader
        title="Learning Improvement & Remedial History"
        subtitle="Review your progress after unsuccessful quiz attempts and completed remedial activities."
      />

      {loading ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center", marginTop: "24px" }}>
          <div className="student-loading-spinner" style={{ margin: "0 auto 16px auto" }} />
          <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Loading remedial cycles...</p>
        </div>
      ) : error ? (
        <div className="student-card" style={{ padding: "32px", marginTop: "24px", borderColor: "#FF4054" }}>
          <p style={{ color: "#FF4054", fontWeight: 600, margin: 0 }}>{error}</p>
          <button
            type="button"
            className="student-btn-primary"
            style={{ marginTop: "16px" }}
            onClick={fetchImprovementData}
          >
            Retry
          </button>
        </div>
      ) : cycles.length === 0 ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center", marginTop: "24px" }}>
          <CheckCircle2 size={40} color="#16B978" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            No Remedial History Recorded
          </h3>
          <p style={{ fontSize: "14px", color: "#5D78A3", marginTop: "6px" }}>
            You haven't required any remedial learning cycles or post-remedial reassessments yet. Keep up the good work!
          </p>
        </div>
      ) : (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {cycles.map((cycle) => (
            <div key={cycle.quizId} className="student-card" style={{ padding: "28px 32px" }}>
              {/* Header Title Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #DCE6F3",
                  marginBottom: "24px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
                    {cycle.quizTitle}
                  </h3>
                  <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
                    Lesson: {cycle.lessonTitle} &bull; Skills:{" "}
                    {cycle.skills.length > 0 ? cycle.skills.join(", ") : "General Concepts"}
                  </div>
                </div>

                {cycle.reassessmentAttempt && (
                  <button
                    type="button"
                    className="student-btn-primary"
                    style={{
                      background: "#6C4BFF",
                      padding: "8px 16px",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onClick={() =>
                      navigate(
                        `/student/quizzes/${cycle.quizId}/results/${cycle.reassessmentAttempt!.id}/review`
                      )
                    }
                  >
                    <FileText size={15} />
                    <span>Review Reassessment Answers</span>
                  </button>
                )}
              </div>

              {/* Score Comparison Box */}
              {cycle.baselineScore !== null && (
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #DCE6F3",
                    borderRadius: "14px",
                    padding: "20px 24px",
                    marginBottom: "24px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "20px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>
                      Baseline Attempt Score
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#FF4054", marginTop: "2px" }}>
                      {cycle.baselineScore}%
                    </div>
                  </div>

                  {cycle.retryAttempt && (
                    <div>
                      <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>
                        Ordinary Retry Score
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A", marginTop: "2px" }}>
                        {cycle.retryAttempt.score}%
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500 }}>
                      Reassessment Score
                    </div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color: cycle.reassessmentScore !== null ? "#6C4BFF" : "#9AAAC1",
                        marginTop: "2px",
                      }}
                    >
                      {cycle.reassessmentScore !== null ? `${cycle.reassessmentScore}%` : "Pending"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Performance Change</span>
                      <span title="Difference in percentage points between baseline and post-remedial reassessment scores.">
                        <HelpCircle size={12} color="#9AAAC1" />
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color:
                          cycle.scoreDiff === null
                            ? "#9AAAC1"
                            : cycle.scoreDiff > 0
                            ? "#16B978"
                            : cycle.scoreDiff < 0
                            ? "#FF4054"
                            : "#0B1F3A",
                        marginTop: "2px",
                      }}
                    >
                      {cycle.scoreDiff === null
                        ? "N/A"
                        : cycle.scoreDiff > 0
                        ? `+${cycle.scoreDiff}%`
                        : `${cycle.scoreDiff}%`}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#0B1F3A", marginBottom: "16px" }}>
                  Activity Timeline
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
                  {/* Timeline Step 1: Initial Attempt */}
                  {cycle.baselineAttempt && (
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#FFF1F3",
                          border: "2px solid #FF4054",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#FF4054",
                        }}
                      >
                        1
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                          Initial Quiz Attempt (Baseline) &bull; Score: {cycle.baselineAttempt.score}%
                        </div>
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                          Completed on{" "}
                          {new Date(cycle.baselineAttempt.end_time || cycle.baselineAttempt.start_time).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Step 2: Retry if present */}
                  {cycle.retryAttempt && (
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#EAF3FF",
                          border: "2px solid #126BFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#126BFF",
                        }}
                      >
                        2
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                          Ordinary Retry Attempt &bull; Score: {cycle.retryAttempt.score}%
                        </div>
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                          Completed on{" "}
                          {new Date(cycle.retryAttempt.end_time || cycle.retryAttempt.start_time).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Step 3: Remedial Activities Assigned & Completed */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: cycle.isRemediationComplete ? "#E9FBF4" : "#FFF8E6",
                        border: `2px solid ${cycle.isRemediationComplete ? "#16B978" : "#D97706"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: cycle.isRemediationComplete ? "#16B978" : "#D97706",
                      }}
                    >
                      {cycle.retryAttempt ? 3 : 2}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                        Remedial Learning Activities: {cycle.completedCount} / {cycle.assignedCount} Completed
                      </div>
                      <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                        {cycle.isRemediationComplete
                          ? "All assigned remedial modules completed."
                          : "Incomplete remedial modules pending completion."}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Step 4: Reassessment Completed */}
                  {cycle.reassessmentAttempt && (
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#F1EDFF",
                          border: "2px solid #6C4BFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#6C4BFF",
                        }}
                      >
                        {cycle.retryAttempt ? 4 : 3}
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                          Post-Remedial Reassessment &bull; Score: {cycle.reassessmentAttempt.score}%
                        </div>
                        <div style={{ fontSize: "12px", color: "#5D78A3" }}>
                          Completed on{" "}
                          {new Date(
                            cycle.reassessmentAttempt.end_time || cycle.reassessmentAttempt.start_time
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remedial Activity Items */}
              {cycle.remediations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0B1F3A", marginBottom: "10px" }}>
                    Assigned Remedial Materials
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cycle.remediations.map((rem) => (
                      <div
                        key={rem.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "#F5F8FC",
                          border: "1px solid #DCE6F3",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <BookOpen size={16} color="#126BFF" />
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#0B1F3A" }}>
                            {rem.material_title || "Remedial Learning Material"}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: rem.status === "COMPLETED" ? "#E9FBF4" : "#FFF8E6",
                            color: rem.status === "COMPLETED" ? "#16B978" : "#D97706",
                          }}
                        >
                          {rem.status === "COMPLETED" ? "COMPLETED" : "REQUIRED"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningImprovementPage;
