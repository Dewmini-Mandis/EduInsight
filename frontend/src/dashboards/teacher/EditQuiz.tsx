import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/teacher.css";

type AnswerOption = {
  id?: number;
  answer_text: string;
  is_correct: boolean;
};

type HintItem = {
  id?: number;
  hint_text: string;
  sequence_no: number;
};

type QuestionForm = {
  id?: number;
  question_text: string;
  question_type: "MCQ" | "NUMERIC";
  difficulty_level: "Easy" | "Medium" | "Hard";
  answers: AnswerOption[];
  correct_value: string;
  hints: HintItem[];
};

const EditQuiz = () => {
  const { quizId } = useParams();
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [learningLevel, setLearningLevel] = useState("Beginner");
  const [assignTo, setAssignTo] = useState(teacherClassrooms.length > 0 ? (teacherClassrooms[0].id || teacherClassrooms[0]) : "");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleQuiz, setScheduleQuiz] = useState(true);
  const [releaseTime, setReleaseTime] = useState("");
  const [attemptLimit, setAttemptLimit] = useState("");
  const [order, setOrder] = useState("1");
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [fieldErrors, setFieldErrors] = useState<any>({});

  useEffect(() => {
    const fetchAssets = async () => {
      const token = getToken();
      try {
        const [lessonsRes, quizRes] = await Promise.all([
          fetch("/api/quizzes/lessons/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch(`/api/quizzes/${quizId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!lessonsRes.ok || !quizRes.ok) {
          throw new Error("Unable to retrieve quiz edit metadata.");
        }

        const lessonsData = await lessonsRes.json() as any[];
        const quizData = await quizRes.json() as any;

        setLessons(lessonsData);
        setTitle(quizData.title);
        setDescription(quizData.description);
        setLessonId(quizData.lesson.toString());
        setLearningLevel(quizData.learning_level);
        
        // Map questions
        const mappedQuestions = quizData.questions.map((q: any) => {
          return {
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty_level: q.difficulty_level,
            answers: q.answers || [],
            correct_value: q.correct_value || "",
            hints: q.hints || []
          };
        });
        setQuestions(mappedQuestions);
      } catch (err: any) {
        setError(err.message || "Failed to load quiz details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [quizId]);

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_text: "",
        question_type: "MCQ",
        difficulty_level: "Medium",
        answers: [
          { answer_text: "", is_correct: false },
          { answer_text: "", is_correct: false },
        ],
        correct_value: "",
        hints: [],
      }
    ]);
  };

  const handleRemoveQuestion = (qIdx: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleQuestionChange = (qIdx: number, field: keyof QuestionForm, val: any) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      return { ...q, [field]: val };
    }));
  };

  const handleMCQOptionChange = (qIdx: number, optIdx: number, field: keyof AnswerOption, val: any) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedAnswers = q.answers.map((ans, aIdx) => {
        if (aIdx !== optIdx) {
          if (field === "is_correct" && val === true) {
            return { ...ans, is_correct: false };
          }
          return ans;
        }
        return { ...ans, [field]: val };
      });
      return { ...q, answers: updatedAnswers };
    }));
  };

  const handleAddMCQOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      return {
        ...q,
        answers: [...q.answers, { answer_text: "", is_correct: false }]
      };
    }));
  };

  const handleRemoveMCQOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      return {
        ...q,
        answers: q.answers.filter((_, aIdx) => aIdx !== optIdx)
      };
    }));
  };

  const handleAddHint = (qIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const nextSeq = q.hints.length + 1;
      return {
        ...q,
        hints: [...q.hints, { hint_text: "", sequence_no: nextSeq }]
      };
    }));
  };

  const handleHintChange = (qIdx: number, hintIdx: number, val: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedHints = q.hints.map((hint, hIdx) => {
        if (hIdx !== hintIdx) return hint;
        return { ...hint, hint_text: val };
      });
      return { ...q, hints: updatedHints };
    }));
  };

  const handleRemoveHint = (qIdx: number, hintIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedHints = q.hints
        .filter((_, hIdx) => hIdx !== hintIdx)
        .map((hint, newIdx) => ({ ...hint, sequence_no: newIdx + 1 }));
      return { ...q, hints: updatedHints };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !lessonId || !assignTo) {
      setError("Quiz title, lesson, and assigned class are required.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (q.question_type === "MCQ") {
        if (q.answers.length < 2) {
          setError(`Question ${i + 1} requires at least 2 choices.`);
          return;
        }
        if (q.answers.some(opt => !opt.answer_text.trim())) {
          setError(`Options inside Question ${i + 1} cannot be blank.`);
          return;
        }
        if (!q.answers.some(opt => opt.is_correct)) {
          setError(`Please select a correct option for Question ${i + 1}.`);
          return;
        }
      } else {
        if (!q.correct_value.trim()) {
          setError(`Please write the correct numeric answer for Question ${i + 1}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    const token = getToken();

    const payload = {
      title,
      description,
      lesson: parseInt(lessonId, 10),
      learning_level: learningLevel,
      max_attempts: parseInt(attemptLimit) || 3,
      assigned_class: assignTo ? parseInt(assignTo) : null,
      questions: questions.map(q => {
        const questionPayload: any = {
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty_level: q.difficulty_level,
          hints: q.hints.map(h => ({ hint_text: h.hint_text, sequence_no: h.sequence_no }))
        };
        if (q.id) questionPayload.id = q.id;
        
        if (q.question_type === "MCQ") {
          questionPayload.answers = q.answers.map(a => ({
            answer_text: a.answer_text,
            is_correct: a.is_correct
          }));
        } else {
          questionPayload.correct_value = q.correct_value;
        }
        return questionPayload;
      })
    };

    try {
      const res = await fetch(`/api/quizzes/${quizId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Unable to save quiz changes.");
      }

      alert("Quiz updated successfully.");
      navigate(`/teacher/quizzes/${quizId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading quiz configs...</div>;
  }

  return (
    <div className="teacher-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Back Button */}
      <div style={{ marginBottom: "16px" }}>
        <button 
          onClick={() => navigate("/teacher/quizzes")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Quizzes
        </button>
      </div>

      <h2 className="teacher-card-title" style={{ fontSize: "20px", marginBottom: "24px" }}>Edit Assessment Quiz</h2>

      {error && <div className="teacher-badge danger" style={{ width: "100%", padding: "12px", marginBottom: "20px" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="teacher-form-group">
          <label className="teacher-form-label">Quiz Title</label>
          <input
            type="text"
            className="teacher-form-input"
            value={title}
            onChange={(e) => { setError(""); setTitle(e.target.value); }}
            required
          />
        </div>

        <div className="teacher-form-group">
          <label className="teacher-form-label">Description / Instructions</label>
          <textarea
            className="teacher-form-input"
            style={{ minHeight: "80px", fontFamily: "inherit" }}
            value={description}
            onChange={(e) => { setError(""); setDescription(e.target.value); }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Related Lesson</label>
            <select
              className="teacher-dropdown-filter"
              style={{ width: "100%" }}
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              {lessons.map(l => (
                <option key={l.id} value={l.id.toString()}>{l.title} ({l.term})</option>
              ))}
            </select>
          </div>

          <div className="teacher-form-group">
            <label className="teacher-form-label">Learning Level</label>
            <select
              className="teacher-dropdown-filter"
              style={{ width: "100%" }}
              value={learningLevel}
              onChange={(e) => setLearningLevel(e.target.value)}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Order</label>
            <input
              type="number"
              className="teacher-form-input"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              min="1"
            />
          </div>

        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--teacher-border)", margin: "32px 0" }} />

        <h3 className="teacher-card-title" style={{ fontSize: "16px", marginBottom: "16px" }}>Assignment & Availability</h3>

        <div className="teacher-form-group">
          <label className="teacher-form-label">Assign to <span style={{ color: "red" }}>*</span></label>
          {teacherClassrooms.length > 0 ? (
            <select className="teacher-dropdown-filter" style={{ width: "100%" }} value={assignTo} onChange={(e: any) => { setAssignTo(e.target.value); setFieldErrors({...fieldErrors, assignTo: null}); }}>
              <option value="">Select class</option>
              {teacherClassrooms.map((cls: any) => (
                <option key={cls.id || cls} value={cls.id || cls}>{cls.name || cls}</option>
              ))}
            </select>
          ) : (
            <input 
              className="teacher-form-input"
              value={assignTo} 
              onChange={(e: any) => { setAssignTo(e.target.value); setFieldErrors({...fieldErrors, assignTo: null}); }} 
              placeholder="Enter class name (or configure in Profile)" 
            />
          )}
          {fieldErrors.assignTo && <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>{fieldErrors.assignTo}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Start Date</label>
            <input type="date" className="teacher-form-input" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
          </div>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Due Date</label>
            <input type="date" className="teacher-form-input" value={dueDate} onChange={(e: any) => setDueDate(e.target.value)} />
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Release Time</label>
            <input type="time" className="teacher-form-input" value={releaseTime} onChange={(e: any) => setReleaseTime(e.target.value)} />
          </div>
          <div className="teacher-form-group">
            <label className="teacher-form-label">Attempt Limit</label>
            <input type="number" className="teacher-form-input" value={attemptLimit} onChange={(e: any) => setAttemptLimit(e.target.value)} />
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--teacher-border)", margin: "32px 0" }} />

        <h3 className="teacher-card-title" style={{ fontSize: "16px", marginBottom: "16px" }}>Questions Builder</h3>

        {questions.map((question, qIdx) => (
          <div key={qIdx} className="teacher-quiz-question-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>Question #{qIdx + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
                  onClick={() => handleRemoveQuestion(qIdx)}
                >
                  Remove Question
                </button>
              )}
            </div>

            <div className="teacher-form-group">
              <label className="teacher-form-label">Question Text</label>
              <input
                type="text"
                className="teacher-form-input"
                value={question.question_text}
                onChange={(e) => handleQuestionChange(qIdx, "question_text", e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div className="teacher-form-group">
                <label className="teacher-form-label">Question Type</label>
                <select
                  className="teacher-dropdown-filter"
                  style={{ width: "100%" }}
                  value={question.question_type}
                  onChange={(e) => handleQuestionChange(qIdx, "question_type", e.target.value)}
                >
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="NUMERIC">Numeric Answer</option>
                </select>
              </div>

              <div className="teacher-form-group">
                <label className="teacher-form-label">Difficulty Level</label>
                <select
                  className="teacher-dropdown-filter"
                  style={{ width: "100%" }}
                  value={question.difficulty_level}
                  onChange={(e) => handleQuestionChange(qIdx, "difficulty_level", e.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* MCQ Options */}
            {question.question_type === "MCQ" ? (
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="teacher-form-label">Answer Options</label>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
                    onClick={() => handleAddMCQOption(qIdx)}
                  >
                    + Add Option
                  </button>
                </div>

                <div className="teacher-quiz-answers-grid">
                  {question.answers.map((opt, optIdx) => (
                    <div key={optIdx} className="teacher-quiz-answer-input-row">
                      <input
                        type="radio"
                        name={`correct-option-${qIdx}`}
                        checked={opt.is_correct}
                        onChange={(e) => handleMCQOptionChange(qIdx, optIdx, "is_correct", e.target.checked)}
                      />
                      <input
                        type="text"
                        className="teacher-form-input"
                        placeholder={`Option ${optIdx + 1}`}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "13px" }}
                        value={opt.answer_text}
                        onChange={(e) => handleMCQOptionChange(qIdx, optIdx, "answer_text", e.target.value)}
                        required
                      />
                      {question.answers.length > 2 && (
                        <button
                          type="button"
                          style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px" }}
                          onClick={() => handleRemoveMCQOption(qIdx, optIdx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Numeric Option
              <div className="teacher-form-group" style={{ marginTop: "16px" }}>
                <label className="teacher-form-label">Correct Value (Integer/Decimal)</label>
                <input
                  type="text"
                  className="teacher-form-input"
                  value={question.correct_value}
                  onChange={(e) => handleQuestionChange(qIdx, "correct_value", e.target.value)}
                  required
                />
              </div>
            )}

            {/* Hints Section */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="teacher-form-label" style={{ fontSize: "12px", color: "#475569" }}>Hints (Optional)</label>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#0891b2", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
                  onClick={() => handleAddHint(qIdx)}
                >
                  + Add Hint
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {question.hints.map((hint, hintIdx) => (
                  <div key={hintIdx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>Hint #{hint.sequence_no}:</span>
                    <input
                      type="text"
                      className="teacher-form-input"
                      style={{ flex: 1, padding: "6px 12px", fontSize: "13px" }}
                      value={hint.hint_text}
                      onChange={(e) => handleHintChange(qIdx, hintIdx, e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}
                      onClick={() => handleRemoveHint(qIdx, hintIdx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="teacher-btn-secondary"
          style={{ width: "100%", padding: "12px", marginTop: "8px" }}
          onClick={handleAddQuestion}
        >
          + Add Question
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px" }}>
          <button
            type="button"
            className="teacher-btn-secondary"
            onClick={() => navigate(`/teacher/quizzes/${quizId}`)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="teacher-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditQuiz;
