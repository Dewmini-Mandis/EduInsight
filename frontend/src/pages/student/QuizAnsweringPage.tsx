import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BookOpen, Clock, LogOut, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

const QuizAnsweringPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Square Root";
  const lessonIdParam = searchParams.get("lessonId") || "";

  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  const [subjectName, setSubjectName] = useState<string>("Mathematics");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Attempt & Timer state
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes default
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showIncompletePopup, setShowIncompletePopup] = useState<boolean>(false);
  const [incompleteUnansweredCount, setIncompleteUnansweredCount] = useState<number>(0);
  const [firstUnansweredIndex, setFirstUnansweredIndex] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedAnswersRef = useRef<Record<number, number>>({});
  const typedAnswersRef = useRef<Record<number, string>>({});

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    typedAnswersRef.current = typedAnswers;
  }, [typedAnswers]);

  // 1. Initialize or resume quiz attempt
  useEffect(() => {
    const initQuizAttempt = async () => {
      setLoading(true);
      setApiError(null);
      setQuestions([]);
      setSelectedAnswers({});
      setTypedAnswers({});
      setCurrentIndex(0);
      setAttemptId(null);

      // Check if attempt data was passed directly via navigation state
      const initialAttempt = (location.state as any)?.initialAttempt;
      if (
        initialAttempt &&
        (String(initialAttempt.quiz) === String(quizId) ||
          String(initialAttempt.quiz?.id) === String(quizId) ||
          String(initialAttempt.quiz_id) === String(quizId))
      ) {
        setAttemptId(initialAttempt.id);
        if (initialAttempt.quiz_title) setQuizTitle(initialAttempt.quiz_title);
        if (initialAttempt.subject_name || initialAttempt.subject) {
          setSubjectName(initialAttempt.subject_name || initialAttempt.subject);
        }
        if (initialAttempt.expires_at) {
          const expireTime = new Date(initialAttempt.expires_at).getTime();
          const now = Date.now();
          const rem = Math.max(0, Math.floor((expireTime - now) / 1000));
          setSecondsRemaining(rem);
        }
        if (initialAttempt.attempt_questions && initialAttempt.attempt_questions.length > 0) {
          const qList = initialAttempt.attempt_questions
            .map((aq: any) => aq.question_detail)
            .filter(Boolean);
          if (qList.length > 0) setQuestions(qList);
        }
        if (initialAttempt.answers) {
          const restoredSel: Record<number, number> = {};
          const restoredTyp: Record<number, string> = {};
          initialAttempt.answers.forEach((ans: any) => {
            if (ans.selected_answer) restoredSel[ans.question] = ans.selected_answer;
            if (ans.typed_answer) restoredTyp[ans.question] = ans.typed_answer;
          });
          setSelectedAnswers(restoredSel);
          setTypedAnswers(restoredTyp);
        }
        setLoading(false);
        return;
      }

      const token = getToken();

      if (token && quizId) {
        try {
          // Check for active or start new attempt
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
            setAttemptId(attemptData.id);

            if (attemptData.quiz_title) setQuizTitle(attemptData.quiz_title);
            if (attemptData.subject_name || attemptData.subject) {
              setSubjectName(attemptData.subject_name || attemptData.subject);
            }

            // Server-authoritative timer deadline
            if (attemptData.expires_at) {
              const expireTime = new Date(attemptData.expires_at).getTime();
              const now = Date.now();
              const rem = Math.max(0, Math.floor((expireTime - now) / 1000));
              setSecondsRemaining(rem);
            }

            // Restore questions
            if (attemptData.attempt_questions && attemptData.attempt_questions.length > 0) {
              const qList = attemptData.attempt_questions
                .map((aq: any) => aq.question_detail)
                .filter(Boolean);
              if (qList.length > 0) setQuestions(qList);
            }

            // Restore saved answers
            if (attemptData.answers) {
              const restoredSel: Record<number, number> = {};
              const restoredTyp: Record<number, string> = {};
              attemptData.answers.forEach((ans: any) => {
                if (ans.selected_answer) restoredSel[ans.question] = ans.selected_answer;
                if (ans.typed_answer) restoredTyp[ans.question] = ans.typed_answer;
              });
              setSelectedAnswers(restoredSel);
              setTypedAnswers(restoredTyp);
            }

            // Restore local storage offline backup if available
            try {
              const cached = localStorage.getItem(`draft_attempt_${quizId}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.selectedAnswers) setSelectedAnswers(parsed.selectedAnswers);
                if (parsed.typedAnswers) setTypedAnswers(parsed.typedAnswers);
              }
            } catch (e) {
              console.error("Local storage read error:", e);
            }
          } else {
            const errData = await startRes.json().catch(() => ({}));
            const errorMsg = errData.detail || "This quiz is unavailable or may have been deleted.";
            setApiError(errorMsg);
          }
        } catch (err) {
          console.error("Error starting quiz attempt:", err);
          setApiError("Unable to connect to the quiz server. Please try again.");
          setSyncStatus("offline");
        }
      } else {
        setApiError("Invalid quiz parameters or authentication required.");
      }

      setLoading(false);
    };

    initQuizAttempt();
  }, [quizId]);

  // 2. Server-Authoritative Timer Countdown
  const handleFinalSubmitRef = useRef<(isAutoSubmit?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    if (loading || submitting) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          // Auto submit when time expires
          if (handleFinalSubmitRef.current) {
            handleFinalSubmitRef.current(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, submitting]);

  // 3. Debounced Autosave to Backend
  const saveAnswersToBackend = useCallback(
    async (updatedSel: Record<number, number>, updatedTyp: Record<number, string>) => {
      setSyncStatus("saving");

      // Save to LocalStorage immediately
      try {
        localStorage.setItem(
          `draft_attempt_${quizId}`,
          JSON.stringify({ selectedAnswers: updatedSel, typedAnswers: updatedTyp, timestamp: Date.now() })
        );
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }

      const token = getToken();
      if (!token || !attemptId) {
        setSyncStatus("offline");
        return;
      }

      try {
        const payload = {
          answers: questions.map((q) => ({
            question: q.id,
            selected_answer: updatedSel[q.id] || null,
            typed_answer: updatedTyp[q.id] || "",
            hint_count: 0,
          })),
        };

        const res = await fetch(`/api/attempts/attempts/${attemptId}/save_answers/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setSyncStatus("saved");
        } else {
          setSyncStatus("offline");
        }
      } catch (e) {
        console.error("Autosave network error:", e);
        setSyncStatus("offline");
      }
    },
    [attemptId, quizId, questions]
  );

  const handleSelectOption = (questionId: number, answerId: number) => {
    const nextSel = { ...selectedAnswersRef.current, [questionId]: answerId };
    selectedAnswersRef.current = nextSel;
    setSelectedAnswers(nextSel);

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      saveAnswersToBackend(nextSel, typedAnswersRef.current);
    }, 500);
  };

  const handleSaveAndExit = async () => {
    setSyncStatus("saving");
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    await saveAnswersToBackend(selectedAnswersRef.current, typedAnswersRef.current);
    navigate(`/student/learning-path/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}`);
  };

  // 4. Submission Validation & Final Submission Action
  const handleSubmitClick = () => {
    if (submitting) return;

    // Check latest answered questions using synchronous refs
    const currentSel = selectedAnswersRef.current;
    const currentTyp = typedAnswersRef.current;

    const answeredSet = new Set(
      questions
        .filter(
          (q) =>
            currentSel[q.id] !== undefined ||
            (currentTyp[q.id] !== undefined && String(currentTyp[q.id]).trim() !== "")
        )
        .map((q) => q.id)
    );

    const answeredCount = answeredSet.size;
    const unansweredCount = Math.max(0, questions.length - answeredCount);

    if (unansweredCount > 0) {
      // BUSINESS RULE: Block manual submission if any question is unanswered
      const firstUnansIdx = questions.findIndex((q) => !answeredSet.has(q.id));
      setIncompleteUnansweredCount(unansweredCount);
      setFirstUnansweredIndex(firstUnansIdx !== -1 ? firstUnansIdx : 0);
      setShowIncompletePopup(true);
      return;
    }

    // All questions answered: Proceed to final submission
    handleFinalSubmit(false);
  };

  const handleFinalSubmit = async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    setShowIncompletePopup(false);
    setShowSubmitConfirm(false);

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    const token = getToken();
    let scorePct = 0;
    let finalAttemptId = attemptId;

    const currentSel = selectedAnswersRef.current;
    const currentTyp = typedAnswersRef.current;

    let submittedAttemptData: any = null;

    if (token && attemptId) {
      try {
        const payload = {
          is_auto_submit: isAutoSubmit,
          answers: questions.map((q) => ({
            question: q.id,
            selected_answer: currentSel[q.id] !== undefined ? currentSel[q.id] : null,
            typed_answer: currentTyp[q.id] !== undefined ? currentTyp[q.id] : "",
            hint_count: 0,
          })),
        };

        const res = await fetch(`/api/attempts/attempts/${attemptId}/submit/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const resData = await res.json();
          submittedAttemptData = resData;
          scorePct = resData.score !== undefined ? Math.round(resData.score) : 0;
          finalAttemptId = resData.id || attemptId;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error("Submit API error:", errData);
          setSubmitting(false);
          if (errData.detail) {
            alert(errData.detail);
          } else {
            alert("Quiz submission failed. Please ensure all questions are answered and try again.");
          }
          return;
        }
      } catch (err) {
        console.error("Submit API error:", err);
        setSubmitting(false);
        alert("Network error during quiz submission. Please try again.");
        return;
      }
    } else {
      // Offline / fallback calculation
      let correct = 0;
      questions.forEach((q) => {
        const chosen = currentSel[q.id];
        const correctAns = q.answers?.find((a: any) => a.is_correct);
        if (chosen && correctAns && chosen === correctAns.id) {
          correct++;
        }
      });
      scorePct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      finalAttemptId = attemptId || 999;
    }

    // Clear local storage draft
    try {
      localStorage.removeItem(`draft_attempt_${quizId}`);
    } catch (e) {}

    // Navigate to Quiz Results Page
    navigate(
      `/student/quizzes/${quizId}/results/${finalAttemptId}?termName=${encodeURIComponent(
        termName
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}&score=${scorePct}&auto=${isAutoSubmit}`,
      { state: { result: submittedAttemptData, attempt: submittedAttemptData } }
    );
  };

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  handleFinalSubmitRef.current = handleFinalSubmit;

  const currentQuestion = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length + Object.keys(typedAnswers).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isWarningTimer = secondsRemaining <= 120; // 2 minutes warning

  const breadcrumbsList = [
    { label: "Home", path: "/student/my-learning" },
    { label: "My Learning", path: "/student/my-learning" },
    { label: termName, path: `/student/my-learning/term/${encodeURIComponent(termName)}/lessons` },
    { label: lessonTitleParam },
  ];

  if (loading) {
    return (
      <div className="student-full-page-container">
        <div style={{ padding: "60px", textAlign: "center", color: "#5D78A3", fontSize: "16px" }}>
          Loading quiz assessment...
        </div>
      </div>
    );
  }

  if (apiError || questions.length === 0) {
    return (
      <div className="student-full-page-container">
        <Breadcrumbs items={breadcrumbsList} />
        <div className="student-card" style={{ padding: "40px", textAlign: "center", maxWidth: "600px", margin: "40px auto" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#FFF1F3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertTriangle size={32} color="#EF4444" />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0B1F3A", marginBottom: "8px" }}>
            Quiz Unavailable
          </h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", marginBottom: "24px" }}>
            {apiError || "No questions found for this quiz. Please contact your teacher."}
          </p>
          <button
            type="button"
            className="student-btn-primary"
            onClick={() => navigate(lessonIdParam ? `/student/learning-path/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}` : "/student/learning-path")}
          >
            Return to Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-full-page-container">
      <Breadcrumbs items={breadcrumbsList} />

      {/* 1. Header Card */}
      <div className="student-header-card">
        <div className="student-header-left">
          <div className="student-header-icon-box">
            <BookOpen size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 className="student-header-title">{quizTitle}</h1>
            <p className="student-header-subtitle">Answer all questions and submit</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Sync Status Badge */}
          {syncStatus === "saving" && (
            <span style={{ fontSize: "12px", color: "#5D78A3", fontWeight: "600" }}>Saving...</span>
          )}

          {/* Countdown Timer */}
          <div className={`student-timer-pill ${isWarningTimer ? "warning" : ""}`}>
            <Clock size={16} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Save & Exit Button */}
          <button
            type="button"
            className="student-btn-secondary"
            onClick={handleSaveAndExit}
          >
            <LogOut size={16} />
            Save & Exit
          </button>
        </div>
      </div>

      {/* 2. Progress Area Card */}
      <div className="student-card" style={{ padding: "14px 24px", marginBottom: "10px" }}>
        <div className="student-quiz-progress-top" style={{ marginBottom: "10px" }}>
          <div className="student-quiz-qcount">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
          <div className="student-quiz-progress-bar-container">
            <div
              className="student-quiz-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="student-quiz-percentage">{progressPercentage}%</div>
        </div>

        {/* Numbered Question Navigation Pills */}
        <div className="student-question-pills-row">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = selectedAnswers[q.id] !== undefined || typedAnswers[q.id] !== undefined;

            let pillClass = "student-qpill";
            if (isCurrent) pillClass += " active";
            else if (isAnswered) pillClass += " answered";

            return (
              <button
                key={q.id || idx}
                type="button"
                className={pillClass}
                onClick={() => setCurrentIndex(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Question Card */}
      <div className="student-card" style={{ padding: "24px 28px", marginBottom: "10px" }}>
        <div className="student-question-label">Question {currentIndex + 1}</div>
        <h2 className="student-question-title" style={{ fontSize: "20px", marginBottom: "18px" }}>
          {currentQuestion.question_text}
        </h2>

        {/* Single-Column Answer Options */}
        <div className="student-options-container" style={{ marginBottom: "20px" }}>
          {currentQuestion.answers?.map((ans: any, aIdx: number) => {
            const optionBadge = String.fromCharCode(65 + aIdx); // A, B, C, D
            const isSelected = selectedAnswers[currentQuestion.id] === ans.id;

            return (
              <div
                key={ans.id || aIdx}
                className={`student-answer-option-row ${isSelected ? "selected" : ""}`}
                style={{ padding: "12px 18px" }}
                onClick={() => handleSelectOption(currentQuestion.id, ans.id)}
              >
                <div className={`student-option-radio ${isSelected ? "selected" : ""}`}>
                  {isSelected && <div className="student-option-radio-inner" />}
                </div>

                <div className={`student-option-badge ${isSelected ? "selected" : ""}`}>
                  {optionBadge}
                </div>

                <span className="student-option-text" style={{ fontSize: "14px" }}>
                  {ans.answer_text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="student-question-actions">
          <button
            type="button"
            className="student-btn-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              type="button"
              className="student-btn-primary"
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            >
              Next Question
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="student-btn-primary"
              disabled={submitting}
              onClick={handleSubmitClick}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Bottom Metadata Footer Bar */}
      <div className="student-quiz-meta-footer">
        <div className="student-quiz-meta-col">
          <span className="student-meta-label">Total Questions</span>
          <span className="student-meta-val">{totalQuestions} Questions</span>
        </div>
        <div className="student-quiz-meta-col">
          <span className="student-meta-label">Question Type</span>
          <span className="student-meta-val">Single Answer</span>
        </div>
        <div className="student-quiz-meta-col">
          <span className="student-meta-label">Subject</span>
          <span className="student-meta-val">{subjectName}</span>
        </div>
      </div>

      {/* INCOMPLETE QUIZ POPUP MODAL (BLOCKS SUBMISSION - ONLY ONE BUTTON: Return to Quiz) */}
      {showIncompletePopup && (
        <div className="student-quiz-modal-overlay">
          <div className="student-quiz-modal" style={{ maxWidth: "480px" }}>
            <div className="student-quiz-modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                Complete All Questions
              </h3>
            </div>
            <div className="student-quiz-modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#FFF1F3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={28} color="#EF4444" />
                </div>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0B1F3A" }}>
                  You still have <span style={{ color: "#EF4444" }}>{incompleteUnansweredCount} unanswered {incompleteUnansweredCount === 1 ? "question" : "questions"}</span>.
                </h4>
                <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3", lineHeight: "1.5" }}>
                  Please answer every question before submitting the quiz.
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#8C9BAE", fontWeight: "500" }}>
                  Your current answers are saved.
                </p>
              </div>

              {/* ONLY ONE PRIMARY ACTION BUTTON: Return to Quiz. NO SUBMIT BUTTON! */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                <button
                  type="button"
                  className="student-btn-primary"
                  style={{ width: "100%", maxWidth: "220px" }}
                  onClick={() => {
                    setShowIncompletePopup(false);
                    if (firstUnansweredIndex >= 0 && firstUnansweredIndex < questions.length) {
                      setCurrentIndex(firstUnansweredIndex);
                    }
                  }}
                >
                  Return to Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizAnsweringPage;
