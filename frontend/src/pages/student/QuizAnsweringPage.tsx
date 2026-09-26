import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Clock, LogOut, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Breadcrumbs from "../../components/student/Breadcrumbs";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

// Fallback questions for demonstration matching screenshot 1
const mockQuizQuestions = [
  {
    id: 1,
    question_text: "What is the perimeter of a rectangle with length 12 cm and width 5 cm?",
    question_type: "MCQ",
    answers: [
      { id: 101, answer_text: "17 cm" },
      { id: 102, answer_text: "34 cm" },
      { id: 103, answer_text: "60 cm" },
      { id: 104, answer_text: "24 cm" },
    ],
  },
  {
    id: 2,
    question_text: "A square field has a side length of 8 meters. What is its total perimeter?",
    question_type: "MCQ",
    answers: [
      { id: 105, answer_text: "16 m" },
      { id: 106, answer_text: "64 m" },
      { id: 107, answer_text: "32 m" },
      { id: 108, answer_text: "24 m" },
    ],
  },
  {
    id: 3,
    question_text: "What is the square root of 144?",
    question_type: "MCQ",
    answers: [
      { id: 109, answer_text: "10" },
      { id: 110, answer_text: "12" },
      { id: 111, answer_text: "14" },
      { id: 112, answer_text: "16" },
    ],
  },
  {
    id: 4,
    question_text: "Calculate the perimeter of an equilateral triangle with a side of 9 cm.",
    question_type: "MCQ",
    answers: [
      { id: 113, answer_text: "18 cm" },
      { id: 114, answer_text: "27 cm" },
      { id: 115, answer_text: "36 cm" },
      { id: 116, answer_text: "81 cm" },
    ],
  },
  {
    id: 5,
    question_text: "If the area of a square is 49 cm², what is its perimeter?",
    question_type: "MCQ",
    answers: [
      { id: 117, answer_text: "14 cm" },
      { id: 118, answer_text: "28 cm" },
      { id: 119, answer_text: "35 cm" },
      { id: 120, answer_text: "49 cm" },
    ],
  },
  {
    id: 6,
    question_text: "Find the perimeter of a regular pentagon with side length 6 cm.",
    question_type: "MCQ",
    answers: [
      { id: 121, answer_text: "24 cm" },
      { id: 122, answer_text: "30 cm" },
      { id: 123, answer_text: "36 cm" },
      { id: 124, answer_text: "40 cm" },
    ],
  },
  {
    id: 7,
    question_text: "What is the perimeter of a triangle with sides 5 cm, 7 cm, and 10 cm?",
    question_type: "MCQ",
    answers: [
      { id: 125, answer_text: "22 cm" },
      { id: 126, answer_text: "24 cm" },
      { id: 127, answer_text: "35 cm" },
      { id: 128, answer_text: "70 cm" },
    ],
  },
  {
    id: 8,
    question_text: "A rectangular garden is 15 m long and 10 m wide. How much fencing is needed to enclose it?",
    question_type: "MCQ",
    answers: [
      { id: 129, answer_text: "25 m" },
      { id: 130, answer_text: "50 m" },
      { id: 131, answer_text: "150 m" },
      { id: 132, answer_text: "30 m" },
    ],
  },
  {
    id: 9,
    question_text: "What is the square root of 81?",
    question_type: "MCQ",
    answers: [
      { id: 133, answer_text: "7" },
      { id: 134, answer_text: "8" },
      { id: 135, answer_text: "9" },
      { id: 136, answer_text: "18" },
    ],
  },
  {
    id: 10,
    question_text: "Find the side length of a square whose perimeter is 40 cm.",
    question_type: "MCQ",
    answers: [
      { id: 137, answer_text: "5 cm" },
      { id: 138, answer_text: "10 cm" },
      { id: 139, answer_text: "15 cm" },
      { id: 140, answer_text: "20 cm" },
    ],
  },
];

const QuizAnsweringPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const termName = searchParams.get("termName") || "Term 1";
  const lessonTitleParam = searchParams.get("lessonTitle") || "Square Root";
  const lessonIdParam = searchParams.get("lessonId") || "";

  const [quizTitle, setQuizTitle] = useState<string>("Square Root 2");
  const [subjectName, setSubjectName] = useState<string>("Mathematics");
  const [questions, setQuestions] = useState<any[]>(mockQuizQuestions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});

  // Attempt & Timer state
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes default
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize or resume quiz attempt
  useEffect(() => {
    const initQuizAttempt = async () => {
      setLoading(true);
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
          }
        } catch (err) {
          console.error("Error starting quiz attempt:", err);
          setSyncStatus("offline");
        }
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
    const nextSel = { ...selectedAnswers, [questionId]: answerId };
    setSelectedAnswers(nextSel);

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      saveAnswersToBackend(nextSel, typedAnswers);
    }, 500);
  };

  const handleSaveAndExit = async () => {
    setSyncStatus("saving");
    await saveAnswersToBackend(selectedAnswers, typedAnswers);
    navigate(`/student/learning-path/term/${encodeURIComponent(termName)}/lessons/${lessonIdParam}`);
  };

  // 4. Final Submission
  const handleFinalSubmit = async (isAutoSubmit = false) => {
    setSubmitting(true);
    setShowSubmitConfirm(false);

    const token = getToken();
    let scorePct = 80;
    let finalAttemptId = attemptId;

    if (token && attemptId) {
      try {
        const payload = {
          answers: questions.map((q) => ({
            question: q.id,
            selected_answer: selectedAnswers[q.id] || null,
            typed_answer: typedAnswers[q.id] || "",
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
          scorePct = resData.score !== undefined ? resData.score : scorePct;
          finalAttemptId = resData.id || attemptId;
        }
      } catch (err) {
        console.error("Submit API error:", err);
      }
    } else {
      // Offline / fallback calculation
      let correct = 0;
      questions.forEach((q) => {
        const chosen = selectedAnswers[q.id];
        const correctAns = q.answers?.find((a: any) => a.is_correct);
        if (chosen && correctAns && chosen === correctAns.id) {
          correct++;
        }
      });
      scorePct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 80;
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
      )}&lessonTitle=${encodeURIComponent(lessonTitleParam)}&lessonId=${lessonIdParam}&score=${scorePct}&auto=${isAutoSubmit}`
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
    { label: "Home", path: "/student/learning-path" },
    { label: "Learning Path", path: "/student/learning-path" },
    { label: termName, path: `/student/learning-path/term/${encodeURIComponent(termName)}/lessons` },
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
              onClick={() => setShowSubmitConfirm(true)}
            >
              Submit Quiz
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

      {/* SUBMISSION CONFIRMATION DIALOG */}
      {showSubmitConfirm && (
        <div className="student-quiz-modal-overlay">
          <div className="student-quiz-modal" style={{ maxWidth: "480px" }}>
            <div className="student-quiz-modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                Confirm Quiz Submission
              </h3>
            </div>
            <div className="student-quiz-modal-body" style={{ textAlign: "center", padding: "24px" }}>
              {unansweredCount > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <AlertTriangle size={36} color="#D97706" />
                  <p style={{ margin: 0, fontSize: "15px", color: "#0B1F3A" }}>
                    You have <strong style={{ color: "#D97706" }}>{unansweredCount} unanswered questions</strong>.
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#5D78A3" }}>
                    Are you sure you want to submit your quiz now? Unanswered questions will be marked as 0.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <CheckCircle2 size={36} color="#16B978" />
                  <p style={{ margin: 0, fontSize: "15px", color: "#0B1F3A" }}>
                    All <strong>{totalQuestions} questions</strong> have been answered!
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#5D78A3" }}>
                    Ready to complete and submit your assessment?
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" }}>
                <button
                  type="button"
                  className="student-btn-secondary"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Return to Quiz
                </button>
                <button
                  type="button"
                  className="student-btn-primary"
                  disabled={submitting}
                  onClick={() => handleFinalSubmit(false)}
                >
                  {submitting ? "Submitting..." : "Yes, Submit Quiz"}
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
