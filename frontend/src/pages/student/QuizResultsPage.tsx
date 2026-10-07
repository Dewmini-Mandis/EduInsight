import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BookOpen, CheckCircle2, Check, X, Target, FileText, Clock, ArrowRight, HelpCircle, AlertTriangle, ShieldCheck, Info, ChevronDown, ChevronUp, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import QuickFeedback from "../../components/student/QuickFeedback";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/student.css";

const QuizResultsPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Lesson Quiz";
  const lessonIdParam = searchParams.get("lessonId") || "";

  const [quizTitle, setQuizTitle] = useState<string>("");
  const [subjectName, setSubjectName] = useState<string>("Mathematics");
  const [scorePercentage, setScorePercentage] = useState<number>(0);
  const [accuracyPercentage, setAccuracyPercentage] = useState<number>(0);
  const [passMark, setPassMark] = useState<number>(60);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [skillResults, setSkillResults] = useState<any[]>([]);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [incorrectCount, setIncorrectCount] = useState<number>(0);
  const [unansweredCount, setUnansweredCount] = useState<number>(0);
  const [timeTakenText, setTimeTakenText] = useState<string>("00:00");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [actualAttemptId, setActualAttemptId] = useState<string | number>(attemptId || "");
  const [riskPrediction, setRiskPrediction] = useState<any>(null);
  const [riskSupport, setRiskSupport] = useState<any>(null);
  const [technicalData, setTechnicalData] = useState<any>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [allMaterialsCompleted, setAllMaterialsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResultsData = async () => {
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

        // Fetch quiz details, remediation status & all user attempts
        const [quizRes, allAttemptsRes, remRes] = await Promise.all([
          fetch(`/api/quizzes/${quizId}/`, { headers }),
          fetch(`/api/attempts/attempts/?quiz=${quizId}`, { headers }),
          fetch(`/api/attempts/attempts/remediation_status/?quiz=${quizId}`, { headers }),
        ]);

        if (remRes.ok) {
          const remData = await remRes.json();
          setAllMaterialsCompleted(remData.all_materials_completed ?? true);
        }

        let quizObj: any = null;
        if (quizRes.ok) {
          quizObj = await quizRes.json();
        }

        let pastAttemptsList: any[] = [];
        if (allAttemptsRes.ok) {
          const pastData = await allAttemptsRes.json();
          pastAttemptsList = Array.isArray(pastData) ? pastData : pastData.results || [];
        }

        // 1. Determine specific attempt object: navigation state fallback first
        let attemptObj: any = (location.state as any)?.result || (location.state as any)?.attempt || null;

        const targetAttemptId = attemptId && attemptId !== "latest" ? attemptId : attemptObj?.id;

        if (targetAttemptId && (!attemptObj || (!attemptObj.risk_prediction && !attemptObj.risk_support))) {
          const singleAttemptRes = await fetch(`/api/attempts/attempts/${targetAttemptId}/`, { headers });
          if (singleAttemptRes.ok) {
            const fetchedAtt = await singleAttemptRes.json();
            if (fetchedAtt.status === "SUBMITTED" || fetchedAtt.status === "EXPIRED") {
              attemptObj = fetchedAtt;
            }
          }
        }

        // Fallback: If attemptId is "latest" or direct fetch failed/unfinalized, find latest finalized attempt for THIS quiz
        if (!attemptObj && pastAttemptsList.length > 0) {
          const finalizedAttempts = pastAttemptsList.filter(
            (a: any) =>
              (String(a.quiz) === String(quizId) || String(a.quiz?.id) === String(quizId) || String(a.quiz_id) === String(quizId)) &&
              (a.status === "SUBMITTED" || a.status === "EXPIRED")
          );
          finalizedAttempts.sort((a: any, b: any) => (b.attempt_number || 0) - (a.attempt_number || 0) || b.id - a.id);
          attemptObj = finalizedAttempts[0] || null;
        }

        // Ultimate fallback: Any attempt for this quiz
        if (!attemptObj && pastAttemptsList.length > 0) {
          const quizAttempts = pastAttemptsList.filter(
            (a: any) =>
              String(a.quiz) === String(quizId) || String(a.quiz?.id) === String(quizId) || String(a.quiz_id) === String(quizId)
          );
          quizAttempts.sort((a: any, b: any) => (b.attempt_number || 0) - (a.attempt_number || 0) || b.id - a.id);
          attemptObj = quizAttempts[0] || null;
        }

        if (attemptObj) {
          setActualAttemptId(attemptObj.id);
        } else {
          setError("No finalized quiz attempt found to display results.");
          setLoading(false);
          return;
        }

        // Apply Quiz Object Details
        if (quizObj) {
          setQuizTitle(quizObj.title || `Quiz #${quizId}`);
          setSubjectName(quizObj.subject_name || quizObj.subject || lessonTitleParam);
          setPassMark(quizObj.pass_mark ?? 60);

          const maxAtt = quizObj.max_attempts ?? 3;
          setMaxAttempts(maxAtt);
          const ordinaryFinalizedCount = pastAttemptsList.filter(
            (a: any) =>
              (String(a.quiz) === String(quizId) || String(a.quiz?.id) === String(quizId)) &&
              (!a.attempt_type || a.attempt_type === "ORDINARY") &&
              (a.status === "SUBMITTED" || a.status === "EXPIRED")
          ).length;
          setAttemptsRemaining(Math.max(0, maxAtt - ordinaryFinalizedCount));
        }

        // Apply Attempt Object Details
        if (attemptObj) {
          if (attemptObj.risk_support) {
            setRiskSupport(attemptObj.risk_support);
          }
          if (attemptObj.risk_prediction) {
            setRiskPrediction(attemptObj.risk_prediction);
          }
          if (!attemptObj.risk_support && !attemptObj.risk_prediction && attemptObj.id) {
            const retryRes = await fetch(`/api/attempts/attempts/${attemptObj.id}/`, { headers });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              if (retryData.risk_support) setRiskSupport(retryData.risk_support);
              if (retryData.risk_prediction) setRiskPrediction(retryData.risk_prediction);
            }
          }
          if (attemptObj.quiz_title && !quizObj?.title) {
            setQuizTitle(attemptObj.quiz_title);
          }

          const calculatedScore = attemptObj.score !== null && attemptObj.score !== undefined
            ? Math.round(attemptObj.score)
            : 0;
          setScorePercentage(calculatedScore);

          const answersList = attemptObj.answers || [];
          const qCount = Math.max(
            attemptObj.attempt_questions?.length || 0,
            answersList.length || 0,
            quizObj?.questions?.length || 0,
            10
          );
          setTotalQuestions(qCount);

          const correct = answersList.filter((a: any) => a.is_correct === true).length;
          const incorrect = answersList.filter(
            (a: any) =>
              a.is_correct === false &&
              (a.selected_answer !== null && a.selected_answer !== undefined ||
               (a.typed_answer !== null && a.typed_answer !== undefined && String(a.typed_answer).trim() !== ""))
          ).length;

          const unanswered = Math.max(0, qCount - (correct + incorrect));

          setCorrectCount(correct);
          setIncorrectCount(incorrect);
          setUnansweredCount(unanswered);

          const calcAccuracy = qCount > 0 ? Math.round((correct / qCount) * 100) : calculatedScore;
          setAccuracyPercentage(calcAccuracy);

          // Populate per-skill results
          if (attemptObj.skill_results && Array.isArray(attemptObj.skill_results) && attemptObj.skill_results.length > 0) {
            setSkillResults(attemptObj.skill_results);
          } else {
            // Fallback per-skill calculation
            const sMap: Record<number, any> = {};
            answersList.forEach((ans: any) => {
              const sId = ans.skill || ans.question_detail?.skill || 0;
              const sName = ans.skill_name || ans.question_detail?.skill_name || "Skill Evaluation";
              if (!sMap[sId]) {
                sMap[sId] = { skill_id: sId, skill_name: sName, total_questions: 0, correct_count: 0, incorrect_count: 0, accuracy_percentage: 0 };
              }
              sMap[sId].total_questions += 1;
              if (ans.is_correct) sMap[sId].correct_count += 1;
              else sMap[sId].incorrect_count += 1;
            });
            Object.values(sMap).forEach((sData: any) => {
              sData.accuracy_percentage = sData.total_questions > 0 ? Math.round((sData.correct_count / sData.total_questions) * 100) : 0;
            });
            setSkillResults(Object.values(sMap));
          }

          // Calculate time taken
          if (attemptObj.start_time && attemptObj.end_time) {
            const start = new Date(attemptObj.start_time).getTime();
            const end = new Date(attemptObj.end_time).getTime();
            const secs = Math.max(0, Math.floor((end - start) / 1000));
            const m = Math.floor(secs / 60).toString().padStart(2, "0");
            const s = (secs % 60).toString().padStart(2, "0");
            setTimeTakenText(`${m}:${s}`);
          }
        }
      } catch (err: any) {
        console.error("Error loading results data:", err);
        setError(err.message || "Failed to load quiz results.");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchResultsData();
    }
  }, [attemptId, quizId, lessonTitleParam, location.state]);

  const isPassed = scorePercentage >= passMark;

  const [startingTryAgain, setStartingTryAgain] = useState<boolean>(false);

  const handleTryAgain = async () => {
    if (startingTryAgain) return;
    setStartingTryAgain(true);
    const token = getToken();

    if (!token) {
      alert("Authentication token missing. Please log in again.");
      setStartingTryAgain(false);
      return;
    }

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
        const errData = await startRes.json().catch(() => ({}));
        alert(errData.detail || "Unable to start next attempt. Please try again.");
      }
    } catch (err) {
      console.error("Error starting attempt:", err);
      alert("Network error. Unable to connect to quiz server.");
    } finally {
      setStartingTryAgain(false);
    }
  };

  const handleReviewRecommendedMaterials = () => {
    navigate(
      `/student/quizzes/${quizId}/materials?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`
    );
  };

  const handleReviewAnswers = () => {
    const targetId = actualAttemptId || attemptId;
    navigate(
      `/student/quizzes/${quizId}/results/${targetId}/review?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`
    );
  };

  const handleBackToQuizzes = () => {
    if (lessonIdParam) {
      navigate(`/student/my-learning/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}`);
    } else {
      navigate("/student/my-learning");
    }
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
    { label: lessonTitleParam },
  ];

  // Donut chart SVG radius & stroke calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  if (loading) {
    return (
      <div className="student-full-page-container">
        <div style={{ padding: "60px", textAlign: "center", color: "#5D78A3", fontSize: "16px" }}>
          Loading quiz results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-full-page-container">
        <Breadcrumbs items={breadcrumbsList} />
        <div className="student-card" style={{ padding: "32px", borderColor: "#FF4054", marginTop: "20px" }}>
          <h3 style={{ color: "#FF4054", margin: 0 }}>Unable to Load Quiz Results</h3>
          <p style={{ color: "#5D78A3", marginTop: "8px" }}>{error}</p>
          <button
            type="button"
            className="student-btn-primary"
            style={{ marginTop: "16px" }}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-full-page-container">
      <Breadcrumbs items={breadcrumbsList} />

      {/* 1. Completion Header Card */}
      <div className="student-header-card">
        <div className="student-header-left">
          <div className="student-header-icon-box">
            <BookOpen size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 className="student-header-title">Quiz Completed!</h1>
            <p className="student-header-subtitle">Great job finishing {quizTitle}.</p>
          </div>
        </div>

        <div className="student-submitted-badge">
          <CheckCircle2 size={18} />
          <span>Submitted Successfully</span>
        </div>
      </div>

      {/* 2. Main Result Card */}
      <div className="student-card" style={{ padding: "28px 32px" }}>
        <div className="student-result-card-header">
          <div>
            <h2 className="student-result-title">{quizTitle}</h2>
            <div className="student-result-subline">
              {termName} &bull; {subjectName}
            </div>
          </div>

          <div className={`student-status-badge ${isPassed ? "passed" : "needs-practice"}`}>
            {isPassed ? <Check size={16} /> : <X size={16} />}
            <span>{isPassed ? "Passed" : "Failed"}</span>
          </div>
        </div>

        {/* 3 Columns Layout */}
        <div className="student-result-grid-three">
          {/* Column 1: Donut Circular Score */}
          <div className="student-donut-container">
            <div className="student-donut-wrapper">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  className="student-donut-bg-ring"
                />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  className="student-donut-fill-ring"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    stroke: isPassed ? "#126BFF" : "#FF4054",
                  }}
                />
              </svg>
              <div className="student-donut-text">
                <span className="student-donut-score">{scorePercentage}%</span>
                <span className="student-donut-label">Score</span>
              </div>
            </div>
          </div>

          {/* Column 2: Large Correct Fraction */}
          <div className="student-fraction-container">
            <div className="student-fraction-val">
              <span className="student-fraction-num">{correctCount}</span>
              <span className="student-fraction-denom">/ {totalQuestions}</span>
            </div>
            <div className="student-fraction-label">Correct Answers</div>
          </div>

          {/* Column 3: Detailed Correct / Incorrect Breakdown */}
          <div className="student-detail-breakdown-container">
            <div className="student-breakdown-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="student-breakdown-icon-circle correct">
                  <Check size={14} color="#16B978" />
                </div>
                <span className="student-breakdown-text">Correct Answers</span>
              </div>
              <span className="student-breakdown-num">{correctCount}</span>
            </div>

            <div className="student-breakdown-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="student-breakdown-icon-circle incorrect">
                  <X size={14} color="#FF4054" />
                </div>
                <span className="student-breakdown-text">Incorrect Answers</span>
              </div>
              <span className="student-breakdown-num">{incorrectCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Three Summary Metric Cards Row */}
      <div className="student-metrics-three-row">
        {/* Card 1: Accuracy */}
        <div className="student-metric-card">
          <div className="student-metric-icon-box">
            <Target size={22} color="#126BFF" />
          </div>
          <div>
            <div className="student-metric-label">Accuracy</div>
            <div className="student-metric-value">{accuracyPercentage}%</div>
          </div>
        </div>

        {/* Card 2: Questions */}
        <div className="student-metric-card">
          <div className="student-metric-icon-box">
            <FileText size={22} color="#126BFF" />
          </div>
          <div>
            <div className="student-metric-label">Questions</div>
            <div className="student-metric-value">{totalQuestions}</div>
          </div>
        </div>

        {/* Card 3: Time Taken */}
        <div className="student-metric-card">
          <div className="student-metric-icon-box">
            <Clock size={22} color="#126BFF" />
          </div>
          <div>
            <div className="student-metric-label">Time Taken</div>
            <div className="student-metric-value">{timeTakenText}</div>
          </div>
        </div>

        {/* Card 4: ML Student Risk Prediction Removed for Students */}
      </div>

      {/* 3.5. Role-Based Supportive Learning Guidance Card */}
      {(() => {
        const currentUser = getUser();
        const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";

        const handleToggleTechnicalDetails = async () => {
          if (!showTechnicalDetails && !technicalData && actualAttemptId) {
            try {
              const token = getToken();
              const res = await fetch(`/api/attempts/attempts/${actualAttemptId}/technical_explanation/`, {
                headers: { Authorization: `Token ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                setTechnicalData(data);
              }
            } catch (e) {
              console.error("Failed to fetch technical explanation:", e);
            }
          }
          setShowTechnicalDetails(!showTechnicalDetails);
        };

        // Fallback: If no riskSupport or prediction object is present
        if (!riskSupport && !riskPrediction) {
          return (
            <div
              className="student-card"
              style={{
                padding: "20px 24px",
                marginBottom: "20px",
                backgroundColor: "#F8FAFC",
                borderLeft: "4px solid #94A3B8",
                fontSize: "14px",
                color: "#475569",
                fontStyle: "italic",
              }}
            >
              Additional learning guidance is not yet available for this quiz attempt.
            </div>
          );
        }

        const isExtraSupport =
          riskSupport?.status === "extra_support_recommended" ||
          (riskPrediction &&
            (String(riskPrediction.risk_level || "").toUpperCase().includes("HIGH RISK") &&
              !String(riskPrediction.risk_level || "").toUpperCase().includes("NOT HIGH RISK")));

        if (isExtraSupport) {
          const recommendations = riskSupport?.recommendations || [];

          return (
            <div
              className="student-card"
              style={{
                padding: "28px 32px",
                marginBottom: "20px",
                borderLeft: "4px solid #126BFF",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={24} color="#126BFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                    {riskSupport?.display_title || "Extra Support Is Recommended"}
                  </h3>
                  <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                    {riskSupport?.summary ||
                      "Based on your recent quiz activity, you may benefit from reviewing a few topics before attempting the next assessment. This recommendation is intended to help you improve your understanding and confidence."}
                  </p>
                </div>
              </div>

              {/* Recommendation Cards Grid (Max 3) */}
              {recommendations.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    marginBottom: "20px",
                  }}
                >
                  {recommendations.slice(0, 3).map((rec: any, idx: number) => {
                    let IconComponent = BookOpen;
                    if (rec.category === "practise_difficult_questions") IconComponent = Target;
                    else if (rec.category === "take_time_to_understand") IconComponent = Clock;
                    else if (rec.category === "strengthen_understanding" || rec.category === "keep_improving")
                      IconComponent = Sparkles;

                    return (
                      <div
                        key={rec.category || idx}
                        style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              backgroundColor: "#EFF6FF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconComponent size={16} color="#126BFF" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>
                            {rec.title}
                          </h4>
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.45" }}>
                          {rec.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    color: "#475569",
                    marginBottom: "20px",
                  }}
                >
                  Review the recommended learning materials before continuing to the next assessment.
                </div>
              )}

              {/* Next Action Box */}
              <div
                style={{
                  padding: "16px 20px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "10px",
                  border: "1px solid #DBEAFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Next Action
                  </div>
                  <div style={{ fontSize: "14px", color: "#1E40AF", marginTop: "2px", fontWeight: 500 }}>
                    {riskSupport?.next_action?.instruction ||
                      "Complete the recommended learning materials and practise the identified skills before attempting the quiz again."}
                  </div>
                </div>

                <button
                  type="button"
                  className="student-btn-primary"
                  style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={handleReviewRecommendedMaterials}
                >
                  {riskSupport?.next_action?.label || "Review Recommended Materials"}
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Supportive Note */}
              <p style={{ margin: "16px 0 0 0", fontSize: "12px", color: "#64748B", fontStyle: "italic" }}>
                {riskSupport?.supportive_note ||
                  "This recommendation is provided to support your learning and does not represent a final judgement of your ability."}
              </p>

              {/* System Administrator Technical Details Toggle & Panel */}
              {isSystemAdmin && (
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px dashed #CBD5E1" }}>
                  <button
                    type="button"
                    onClick={handleToggleTechnicalDetails}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Info size={14} />
                    {showTechnicalDetails ? "Hide Technical Data" : "Technical Details"}
                    {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showTechnicalDetails && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "16px",
                        backgroundColor: "#0F172A",
                        color: "#F8FAFC",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    >
                      {technicalData ? (
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: "6px", color: "#38BDF8" }}>
                            System Administrator Technical Panel (SHAP Explainer):
                          </div>
                          <div>Explainer Method: {technicalData.method} ({technicalData.explainer_version})</div>
                          <div>Model Version: {technicalData.model_version}</div>
                          <div>Threshold: {technicalData.threshold}</div>
                          <div>Base Value (Log-Odds): {technicalData.base_value}</div>
                          <div style={{ marginTop: "8px", fontWeight: 700 }}>Raw Feature Contributions:</div>
                          {technicalData.factors?.map((f: any, i: number) => (
                            <div key={i} style={{ marginLeft: "12px" }}>
                              • {f.feature} ({f.label}): val={f.value}, SHAP={f.shap_value}, abs={f.absolute_importance}, effect={f.effect}
                            </div>
                          ))}
                          <p style={{ marginTop: "12px", fontSize: "11px", color: "#94A3B8", fontStyle: "italic" }}>
                            * Note: These values describe how the model produced this prediction. They represent predictive contributions and should not be interpreted as causal evidence.
                          </p>
                        </div>
                      ) : (
                        <div>Loading technical explanation...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Default: Good Progress
        return (
          <div
            className="student-card"
            style={{
              padding: "24px 28px",
              marginBottom: "20px",
              borderLeft: "4px solid #16B978",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ECFDF5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={24} color="#16B978" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                  {riskSupport?.display_title || "You Are Making Good Progress"}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                  {riskSupport?.summary ||
                    "Your recent quiz activity indicates satisfactory progress. Continue reviewing your lessons and practising regularly to maintain your improvement."}
                </p>
              </div>
            </div>

            {/* System Administrator Technical Details Toggle & Panel */}
            {isSystemAdmin && (
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #CBD5E1" }}>
                <button
                  type="button"
                  onClick={handleToggleTechnicalDetails}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#475569",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Info size={14} />
                  {showTechnicalDetails ? "Hide Technical Data" : "Technical Details"}
                  {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showTechnicalDetails && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "16px",
                      backgroundColor: "#0F172A",
                      color: "#F8FAFC",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {technicalData ? (
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: "6px", color: "#38BDF8" }}>
                          System Administrator Technical Panel (SHAP Explainer):
                        </div>
                        <div>Explainer Method: {technicalData.method} ({technicalData.explainer_version})</div>
                        <div>Model Version: {technicalData.model_version}</div>
                        <div>Threshold: {technicalData.threshold}</div>
                        <div>Base Value (Log-Odds): {technicalData.base_value}</div>
                        <div style={{ marginTop: "8px", fontWeight: 700 }}>Raw Feature Contributions:</div>
                        {technicalData.factors?.map((f: any, i: number) => (
                          <div key={i} style={{ marginLeft: "12px" }}>
                            • {f.feature} ({f.label}): val={f.value}, SHAP={f.shap_value}, abs={f.absolute_importance}, effect={f.effect}
                          </div>
                        ))}
                        <p style={{ marginTop: "12px", fontSize: "11px", color: "#94A3B8", fontStyle: "italic" }}>
                          * Note: These values describe how the model produced this prediction. They represent predictive contributions and should not be interpreted as causal evidence.
                        </p>
                      </div>
                    ) : (
                      <div>Loading technical explanation...</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. Skill-Level Performance Breakdown Card */}
      {skillResults.length > 0 && (
        <div className="student-card" style={{ padding: "24px 28px" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
            Skill-Level Performance Breakdown
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
            Detailed skill evaluation results for targeted learning recommendations.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {skillResults.map((sr, idx) => (
              <div
                key={sr.skill_id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                    {sr.skill_name || `Skill #${sr.skill_id}`}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Correct: <strong>{sr.correct_count}</strong> / {sr.total_questions} | Incorrect: <strong>{sr.incorrect_count}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: sr.accuracy_percentage >= passMark ? "#16a34a" : "#dc2626" }}>
                      {sr.accuracy_percentage}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Accuracy</div>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      backgroundColor: sr.accuracy_percentage >= passMark ? "#d1fae5" : "#fee2e2",
                      color: sr.accuracy_percentage >= passMark ? "#065f46" : "#991b1b",
                    }}
                  >
                    {sr.accuracy_percentage >= passMark ? "Mastered" : "Needs Review"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Bottom Section: Next Actions + Quick Feedback */}
      <div className="student-results-bottom-row">
        {/* Left Side: Actions Card (60%) */}
        <div className="student-card student-next-actions-card">
          <h3 className="student-next-actions-title">What would you like to do next?</h3>
          <p className="student-next-actions-subtitle">
            {isPassed
              ? "Great job! Choose an option below to continue your learning journey."
              : "Review recommended materials and answers to prepare for your retry attempt."}
          </p>

          {!isPassed && allMaterialsCompleted && (
            <div style={{ backgroundColor: "#E9FBF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={18} color="#16B978" />
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#15803D" }}>Recommended materials completed.</span>
            </div>
          )}

          <div className="student-actions-buttons-row" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              className="student-btn-primary"
              onClick={handleReviewAnswers}
            >
              Review Answers
              <ArrowRight size={18} />
            </button>

            {!isPassed && (
              <button
                type="button"
                className="student-btn-secondary"
                style={{ background: "#EFF6FF", color: "#126BFF", borderColor: "#126BFF" }}
                onClick={handleReviewRecommendedMaterials}
              >
                Review Recommended Materials
              </button>
            )}

            {!isPassed && allMaterialsCompleted && (
              <button
                type="button"
                className="student-btn-primary"
                style={{ background: "#16B978", borderColor: "#16B978" }}
                onClick={handleTryAgain}
              >
                Retry Quiz
              </button>
            )}

            <button
              type="button"
              className="student-btn-secondary"
              onClick={handleBackToQuizzes}
            >
              Back to Quizzes
            </button>
          </div>
        </div>

        {/* Right Side: Quick Feedback Card (40%) */}
        <div style={{ flex: "0 0 38%" }}>
          <QuickFeedback />
        </div>
      </div>
    </div>
  );
};

export default QuizResultsPage;
