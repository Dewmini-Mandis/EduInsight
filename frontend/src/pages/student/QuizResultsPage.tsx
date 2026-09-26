import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CheckCircle2, Check, X, Target, FileText, Clock, ArrowRight } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import QuickFeedback from "../../components/student/QuickFeedback";
import QuizReviewSection from "../../components/student/QuizReviewSection";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

const QuizResultsPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Square Root";
  const lessonIdParam = searchParams.get("lessonId") || "";
  const paramScore = searchParams.get("score");

  const [quizTitle, setQuizTitle] = useState<string>("Square Root 2");
  const [subjectName, setSubjectName] = useState<string>("Mathematics");
  const [scorePercentage, setScorePercentage] = useState<number>(
    paramScore ? parseInt(paramScore, 10) : 80
  );
  const [passMark, setPassMark] = useState<number>(75);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [correctCount, setCorrectCount] = useState<number>(8);
  const [incorrectCount, setIncorrectCount] = useState<number>(2);
  const [timeTakenText, setTimeTakenText] = useState<string>("00:18");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(true);
  const [showReview, setShowReview] = useState<boolean>(false);

  // Review data
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<any[]>([]);

  useEffect(() => {
    const fetchResultsData = async () => {
      setLoading(true);
      const token = getToken();

      if (token && attemptId) {
        try {
          const [attemptRes, quizRes, allAttemptsRes] = await Promise.allSettled([
            fetch(`/api/attempts/attempts/${attemptId}/`, {
              headers: { Authorization: `Token ${token}` },
            }),
            fetch(`/api/quizzes/${quizId}/`, {
              headers: { Authorization: `Token ${token}` },
            }),
            fetch(`/api/attempts/attempts/?quiz=${quizId}`, {
              headers: { Authorization: `Token ${token}` },
            }),
          ]);

          let attemptObj: any = null;
          if (attemptRes.status === "fulfilled" && attemptRes.value.ok) {
            attemptObj = await attemptRes.value.json();
          }

          let quizObj: any = null;
          if (quizRes.status === "fulfilled" && quizRes.value.ok) {
            quizObj = await quizRes.value.json();
          }

          let pastAttemptsList: any[] = [];
          if (allAttemptsRes.status === "fulfilled" && allAttemptsRes.value.ok) {
            const pastData = await allAttemptsRes.value.json();
            pastAttemptsList = Array.isArray(pastData) ? pastData : pastData.results || [];
          }

          if (quizObj) {
            if (quizObj.title) setQuizTitle(quizObj.title);
            if (quizObj.subject_name || quizObj.subject) {
              setSubjectName(quizObj.subject_name || quizObj.subject);
            }
            if (quizObj.pass_mark) setPassMark(quizObj.pass_mark);
            const maxAtt = quizObj.max_attempts || 3;
            const remaining = Math.max(0, maxAtt - pastAttemptsList.length);
            setAttemptsRemaining(remaining);
          }

          if (attemptObj) {
            if (attemptObj.score !== null && attemptObj.score !== undefined) {
              setScorePercentage(Math.round(attemptObj.score));
            }

            // Extract questions and answers for review
            const qList = attemptObj.attempt_questions
              ? attemptObj.attempt_questions.map((aq: any) => aq.question_detail).filter(Boolean)
              : quizObj?.questions || [];
            const ansList = attemptObj.answers || [];

            setReviewQuestions(qList);
            setReviewAnswers(ansList);

            const qTotal = qList.length || 10;
            setTotalQuestions(qTotal);

            const correct = ansList.filter((a: any) => a.is_correct).length;
            setCorrectCount(correct);
            setIncorrectCount(Math.max(0, qTotal - correct));

            // Calculate duration formatted MM:SS
            if (attemptObj.start_time && attemptObj.end_time) {
              const start = new Date(attemptObj.start_time).getTime();
              const end = new Date(attemptObj.end_time).getTime();
              const secs = Math.max(0, Math.floor((end - start) / 1000));
              const m = Math.floor(secs / 60)
                .toString()
                .padStart(2, "0");
              const s = (secs % 60).toString().padStart(2, "0");
              setTimeTakenText(`${m}:${s}`);
            }
          }
        } catch (err) {
          console.error("Error loading results data:", err);
        }
      } else {
        // Fallback calculations matching screenshot 2
        const qCount = 10;
        const cCount = Math.round((scorePercentage / 100) * qCount);
        setTotalQuestions(qCount);
        setCorrectCount(cCount);
        setIncorrectCount(qCount - cCount);
      }

      setLoading(false);
    };

    fetchResultsData();
  }, [attemptId, quizId, scorePercentage]);

  const isPassed = scorePercentage >= passMark;

  const handleTryAgain = () => {
    navigate(
      `/student/quizzes/${quizId}/attempt?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`
    );
  };

  const handleBackToLessons = () => {
    navigate(`/student/learning-path/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}`);
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/learning-path" },
    { label: "Learning Path", path: "/student/learning-path" },
    { label: termName, path: `/student/learning-path/term/${encodeURIComponent(termName)}/lessons` },
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
            <span>{isPassed ? "Passed" : "Needs Practice"}</span>
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
            <div className="student-metric-value">{scorePercentage}%</div>
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
      </div>

      {/* 4. Bottom Section: Next Actions + Quick Feedback */}
      <div className="student-results-bottom-row">
        {/* Left Side: Actions Card (60%) */}
        <div className="student-card student-next-actions-card">
          <h3 className="student-next-actions-title">What would you like to do next?</h3>
          <p className="student-next-actions-subtitle">
            Keep going! Choose an option below to continue your learning journey.
          </p>

          <div className="student-actions-buttons-row">
            <button
              type="button"
              className="student-btn-primary"
              onClick={() => setShowReview(!showReview)}
            >
              {showReview ? "Hide Review" : "Review Answers"}
              <ArrowRight size={18} />
            </button>

            {attemptsRemaining > 0 ? (
              <button
                type="button"
                className="student-btn-secondary"
                onClick={handleTryAgain}
              >
                Try Again
              </button>
            ) : (
              <button
                type="button"
                className="student-btn-secondary"
                onClick={handleBackToLessons}
              >
                Back to Lessons
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Quick Feedback Card (40%) */}
        <div style={{ flex: "0 0 38%" }}>
          <QuickFeedback />
        </div>
      </div>

      {/* Inline Answer Review Section */}
      {showReview && (
        <QuizReviewSection
          questions={reviewQuestions}
          answers={reviewAnswers}
        />
      )}
    </div>
  );
};

export default QuizResultsPage;
