import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Check,
  X,
  ArrowLeft,
  Info,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

import { useLocation } from "react-router-dom";
import { CardSkeleton, TableSkeleton } from "../../components/common/Skeletons";

const QuizReviewPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Lesson";
  const lessonIdParam = searchParams.get("lessonId") || "";

  // Attempt state hydration from location.state if passed from QuizResultsPage
  const initialAttempt = (location.state as any)?.attempt || null;
  const initialQuiz = (location.state as any)?.quiz || null;

  const initialQuestions = initialAttempt?.attempt_questions
    ? initialAttempt.attempt_questions.map((aq: any) => aq.question_detail).filter(Boolean)
    : initialQuiz?.questions || [];
  const initialAnswers = initialAttempt?.answers || [];

  const [quizTitle, setQuizTitle] = useState<string>(
    initialAttempt?.quiz_title || initialQuiz?.title || "Quiz Review"
  );
  const [loading, setLoading] = useState<boolean>(!initialAttempt && initialQuestions.length === 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [questions, setQuestions] = useState<any[]>(initialQuestions);
  const [userAnswers, setUserAnswers] = useState<any[]>(initialAnswers);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (initialAttempt && initialQuestions.length > 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      const token = getToken();

      if (!token || !attemptId || !quizId) {
        setErrorMsg("Authentication token or attempt ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const [attemptRes, quizRes] = await Promise.allSettled([
          fetch(`/api/attempts/attempts/${attemptId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch(`/api/quizzes/${quizId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        let attemptObj: any = null;
        if (attemptRes.status === "fulfilled" && attemptRes.value.ok) {
          attemptObj = await attemptRes.value.json();
        } else {
          throw new Error("Failed to load attempt details.");
        }

        let quizObj: any = null;
        if (quizRes.status === "fulfilled" && quizRes.value.ok) {
          quizObj = await quizRes.value.json();
        }

        if (quizObj && quizObj.title) setQuizTitle(quizObj.title);

        if (attemptObj) {
          if (attemptObj.quiz_title) setQuizTitle(attemptObj.quiz_title);

          const qList = attemptObj.attempt_questions
            ? attemptObj.attempt_questions.map((aq: any) => aq.question_detail).filter(Boolean)
            : quizObj?.questions || [];

          const ansList = attemptObj.answers || [];

          setQuestions(qList);
          setUserAnswers(ansList);
        }
      } catch (err: any) {
        console.error("Error fetching quiz review data:", err);
        setErrorMsg(err.message || "Unable to load review data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [quizId, attemptId]);

  const handleBackToResults = () => {
    navigate(
      `/student/quizzes/${quizId}/results/${attemptId}?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}`
    );
  };

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
    { label: lessonTitleParam, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}` },
    { label: "Review Answers" },
  ];

  // Calculate metrics dynamically from actual attempt data
  const totalQuestions = questions.length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const userAns = userAnswers.find((a: any) => a.question === q.id);
    const hasAnswered =
      userAns && (userAns.selected_answer !== null || (userAns.typed_answer && userAns.typed_answer.trim() !== ""));

    if (!hasAnswered) {
      unansweredCount++;
    } else if (userAns.is_correct) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  if (loading) {
    return (
      <div className="student-full-page-container">
        <Breadcrumbs items={breadcrumbsList} />
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <CardSkeleton count={1} />
          <TableSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="student-full-page-container">
        <Breadcrumbs items={breadcrumbsList} />
        <div className="student-card" style={{ padding: "40px", textAlign: "center" }}>
          <AlertTriangle size={48} color="#FF4054" style={{ marginBottom: "16px" }} />
          <h2 style={{ fontSize: "20px", color: "#0B1F3A", marginBottom: "8px" }}>Review Unavailable</h2>
          <p style={{ color: "#5D78A3", marginBottom: "24px" }}>{errorMsg}</p>
          <button type="button" className="student-btn-primary" onClick={handleBackToResults}>
            <ArrowLeft size={16} /> Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-full-page-container" style={{ maxWidth: "1200px" }}>
      <Breadcrumbs items={breadcrumbsList} />

      {/* 1. Header Card */}
      <div className="student-header-card">
        <div className="student-header-left">
          <div className="student-header-icon-box" style={{ background: "#F1EDFF" }}>
            <FileCheck size={24} color="#6C4BFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 className="student-header-title">Review Answers</h1>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  background: "#F1EDFF",
                  color: "#6C4BFF",
                  padding: "3px 10px",
                  borderRadius: "12px",
                }}
              >
                {quizTitle}
              </span>
            </div>
            <p className="student-header-subtitle">Review your responses and see the correct answers.</p>
          </div>
        </div>

        <button type="button" className="student-btn-secondary" onClick={handleBackToResults}>
          <ArrowLeft size={16} /> Back to Results
        </button>
      </div>

      {/* 2. Answer Summary Card */}
      <div className="student-review-summary-grid">
        <div className="student-review-summary-item">
          <div className="student-review-summary-icon-box" style={{ background: "#EAF3FF", color: "#126BFF" }}>
            <ListChecks size={22} />
          </div>
          <div>
            <div className="student-review-summary-val">{totalQuestions}</div>
            <div className="student-review-summary-label">Total Questions</div>
          </div>
        </div>

        <div className="student-review-summary-item">
          <div className="student-review-summary-icon-box" style={{ background: "#E9FBF4", color: "#16B978" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="student-review-summary-val" style={{ color: "#16B978" }}>
              {correctCount}
            </div>
            <div className="student-review-summary-label">Correct Answers</div>
          </div>
        </div>

        <div className="student-review-summary-item">
          <div className="student-review-summary-icon-box" style={{ background: "#FFF1F3", color: "#EF4444" }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="student-review-summary-val" style={{ color: "#EF4444" }}>
              {incorrectCount}
            </div>
            <div className="student-review-summary-label">Incorrect Answers</div>
          </div>
        </div>
      </div>

      {/* 3. Question List - Vertically Stacked */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "4px" }}>
        {questions.map((q: any, idx: number) => {
          const userAns = userAnswers.find((a: any) => a.question === q.id);
          const hasAnswered =
            userAns &&
            (userAns.selected_answer !== null || (userAns.typed_answer && userAns.typed_answer.trim() !== ""));

          const isCorrect = hasAnswered && userAns.is_correct;
          const isIncorrect = hasAnswered && !userAns.is_correct;
          const isUnanswered = !hasAnswered;

          return (
            <div key={q.id || idx} className="student-card" style={{ padding: "24px 28px", margin: 0 }}>
              {/* Question Header & Status Badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <span className="student-question-label" style={{ fontSize: "14px", color: "#126BFF", fontWeight: "700" }}>
                  Question {idx + 1} of {totalQuestions}
                </span>

                {isCorrect && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      padding: "4px 12px",
                      borderRadius: "16px",
                      background: "#E9FBF4",
                      color: "#16B978",
                      border: "1px solid #16B978",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Check size={14} /> Correct
                  </span>
                )}

                {isIncorrect && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      padding: "4px 12px",
                      borderRadius: "16px",
                      background: "#FFF1F3",
                      color: "#EF4444",
                      border: "1px solid #EF4444",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <X size={14} /> Incorrect
                  </span>
                )}

                {isUnanswered && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      padding: "4px 12px",
                      borderRadius: "16px",
                      background: "#F1F5F9",
                      color: "#5D78A3",
                      border: "1px solid #CBD5E1",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <HelpCircle size={14} /> No answer submitted
                  </span>
                )}
              </div>

              {/* Question Text */}
              <h2 className="student-question-title" style={{ fontSize: "18px", marginBottom: "20px", lineHeight: "1.45" }}>
                {q.question_text}
              </h2>

              {/* MCQ Options */}
              {q.question_type === "MCQ" ? (
                <div className="student-options-container" style={{ marginBottom: "16px" }}>
                  {q.answers?.map((ans: any, aIdx: number) => {
                    const optionBadge = String.fromCharCode(65 + aIdx);
                    const isUserSelected = userAns?.selected_answer === ans.id;
                    const isCorrectOption = ans.is_correct === true;

                    let rowClass = "student-review-option-row";
                    let badgeStyle: React.CSSProperties = {
                      background: "#EAF3FF",
                      color: "#126BFF",
                    };
                    let textStyle: React.CSSProperties = {
                      color: "#0B1F3A",
                      fontWeight: 500,
                    };
                    let statusPill: React.ReactNode = null;

                    if (isCorrectOption) {
                      rowClass += " correct-answer";
                      badgeStyle = { background: "#16B978", color: "#FFFFFF" };
                      textStyle = { color: "#16B978", fontWeight: 700 };

                      if (isUserSelected) {
                        statusPill = (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                background: "#E9FBF4",
                                color: "#16B978",
                                border: "1px solid #16B978",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Check size={12} /> Your Answer
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                background: "#16B978",
                                color: "#FFFFFF",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Check size={12} /> Correct Answer
                            </span>
                          </div>
                        );
                      } else {
                        statusPill = (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              background: "#16B978",
                              color: "#FFFFFF",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Check size={12} /> Correct Answer
                          </span>
                        );
                      }
                    } else if (isUserSelected) {
                      rowClass += " wrong-user";
                      badgeStyle = { background: "#EF4444", color: "#FFFFFF" };
                      textStyle = { color: "#EF4444", fontWeight: 700 };
                      statusPill = (
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#EF4444",
                            color: "#FFFFFF",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <X size={12} /> Your Answer
                        </span>
                      );
                    }

                    return (
                      <div key={ans.id || aIdx} className={rowClass}>
                        <div className="student-option-badge" style={badgeStyle}>
                          {optionBadge}
                        </div>
                        <span className="student-option-text" style={textStyle}>
                          {ans.answer_text}
                        </span>
                        {statusPill}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Numeric Question Type Support */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  <div
                    style={{
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: isCorrect
                        ? "1.5px solid #16B978"
                        : isIncorrect
                        ? "1.5px solid #EF4444"
                        : "1.5px solid #CBD5E1",
                      background: isCorrect ? "#E9FBF4" : isIncorrect ? "#FFF1F3" : "#F8FAFC",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "13px", color: "#5D78A3", display: "block" }}>Your Answer</span>
                      <strong
                        style={{
                          fontSize: "16px",
                          color: isCorrect ? "#16B978" : isIncorrect ? "#EF4444" : "#5D78A3",
                        }}
                      >
                        {hasAnswered ? userAns?.typed_answer : "No answer submitted"}
                      </strong>
                    </div>
                    {isCorrect && (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#E9FBF4",
                            color: "#16B978",
                            border: "1px solid #16B978",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Check size={12} /> Your Answer
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#16B978",
                            color: "#FFFFFF",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Check size={12} /> Correct Answer
                        </span>
                      </div>
                    )}
                    {isIncorrect && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "#EF4444",
                          color: "#FFFFFF",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <X size={12} /> Your Answer
                      </span>
                    )}
                    {isUnanswered && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "#F1F5F9",
                          color: "#5D78A3",
                          border: "1px solid #CBD5E1",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <HelpCircle size={12} /> No answer submitted
                      </span>
                    )}
                  </div>

                  {!isCorrect && (
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: "12px",
                        border: "1.5px solid #16B978",
                        background: "#E9FBF4",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "13px", color: "#5D78A3", display: "block" }}>Correct Answer</span>
                        <strong style={{ fontSize: "16px", color: "#16B978" }}>
                          {q.correct_answer?.correct_value || q.correct_value || "N/A"}
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "#16B978",
                          color: "#FFFFFF",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Check size={12} /> Correct Answer
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Unanswered subtle note */}
              {isUnanswered && (
                <div style={{ fontSize: "13px", color: "#5D78A3", fontStyle: "italic", marginTop: "8px" }}>
                  No answer submitted for this question during your attempt.
                </div>
              )}

              {/* Explanation Section */}
              {(q.explanation || q.explanation_text) && (
                <div className="student-review-explanation-box">
                  <div className="student-review-explanation-title">
                    <Info size={16} /> Explanation
                  </div>
                  <p className="student-review-explanation-text">{q.explanation || q.explanation_text}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Page Navigation */}
      <div style={{ display: "flex", justifyContent: "center", margin: "24px 0 12px 0" }}>
        <button type="button" className="student-btn-primary" style={{ padding: "0 32px" }} onClick={handleBackToResults}>
          <ArrowLeft size={16} /> Back to Results
        </button>
      </div>
    </div>
  );
};

export default QuizReviewPage;
