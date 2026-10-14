import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { 
  Eye, 
  ArrowLeft, 
  FileText, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  Award, 
  Layers, 
  BookOpen, 
  AlertCircle,
  Lightbulb,
  Info
} from "lucide-react";

type AnswerOption = {
  id?: number;
  answer_text: string;
  is_correct: boolean;
};

type QuestionItem = {
  id: number;
  skill?: number;
  skill_name?: string;
  question_text: string;
  question_type: string; // "MCQ", "True / False", "NUMERIC", "Short Answer", etc.
  difficulty_level?: string;
  points?: number;
  answers: AnswerOption[];
  correct_value?: string;
  hints?: any[];
  explanation?: string;
};

type QuizDetailsType = {
  id: number;
  title: string;
  description: string;
  status: string;
  lesson?: number;
  lesson_title?: string;
  quiz_level_name?: string;
  difficulty_name?: string;
  order?: number;
  pass_mark?: number;
  estimated_time_minutes?: number;
  max_attempts?: number;
  questions: QuestionItem[];
  skills?: any[];
  covered_skills_details?: any[];
};

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
};

const TeacherQuizPreview: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [quiz, setQuiz] = useState<QuizDetailsType | null>(null);
  const [skillsMap, setSkillsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [hoverBack, setHoverBack] = useState<boolean>(false);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  useEffect(() => {
    fetchQuizAndSkills();
  }, [quizId]);

  const fetchQuizAndSkills = async () => {
    const token = getToken();
    if (!token || !quizId) return;

    setLoading(true);
    setError("");

    try {
      const [quizRes, skillsRes] = await Promise.all([
        fetch(`/api/quizzes/${quizId}/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/quizzes/skills/", {
          headers: { Authorization: `Token ${token}` },
        }).catch(() => null),
      ]);

      if (!quizRes.ok) {
        if (quizRes.status === 403) {
          setError("You do not have permission to preview this quiz.");
        } else if (quizRes.status === 404) {
          setError("Quiz not found.");
        } else {
          setError("Failed to load quiz preview.");
        }
        return;
      }

      const quizData: QuizDetailsType = await quizRes.json();
      setQuiz(quizData);

      if (skillsRes && skillsRes.ok) {
        const skillsData = await skillsRes.json();
        const sList = Array.isArray(skillsData) ? skillsData : skillsData.results || [];
        const sMap: Record<number, string> = {};
        sList.forEach((s: any) => {
          sMap[s.id] = s.name;
        });
        setSkillsMap(sMap);
      }
    } catch (err) {
      console.error("Error fetching quiz preview:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToQuestion = (index: number) => {
    const el = document.getElementById(`question-card-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveQuestionId(index);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>
        <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Loading quiz preview...</div>
        <div style={{ fontSize: "14px", color: "#8CA3C7" }}>Fetching question bank and correct answer keys</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate("/teacher/quizzes")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "#126BFF",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            alignSelf: "flex-start"
          }}
        >
          <ArrowLeft size={16} /> Back to Quizzes
        </button>

        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          padding: "48px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "#FFE5E8", color: "#FF3347", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={26} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>{error || "Quiz not found"}</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3" }}>Please select a valid quiz from your quiz management page.</p>
          </div>
        </div>
      </div>
    );
  }

  const questionsList = quiz.questions || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "60px" }}>
      
      {/* Breadcrumb & Top Navigation */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "13px", color: "#6F86A5" }}>
          Dashboard &gt; Quizzes &gt; <span style={{ fontWeight: "600", color: "#0B1F3A" }}>Preview Quiz</span>
        </div>

        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4ECF6",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? "20px" : "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              backgroundColor: "#EEF4FB",
              color: "#126BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Eye size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? "22px" : "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: 1.2 }}>
                  Quiz Preview
                </h2>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: "12px",
                  backgroundColor: "#EAF3FF",
                  color: "#126BFF",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  Teacher Read-Only View
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "14.5px", color: "#5D78A3", fontWeight: "400" }}>
                Preview all questions and correct answer keys as students will see them.
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
            onMouseEnter={() => setHoverBack(true)}
            onMouseLeave={() => setHoverBack(false)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px", 
              height: "42px", 
              padding: "0 18px", 
              borderRadius: "9px", 
              border: `1px solid ${hoverBack ? "#C8D8EB" : "#DCE6F3"}`, 
              backgroundColor: hoverBack ? "#EEF4FB" : "#F7FAFE", 
              color: "#3D5E8A", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Back to Edit Quiz
          </button>
        </div>
      </div>

      {/* Quiz Metadata Overview Card */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
              {quiz.title}
            </h3>
            {quiz.description && (
              <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3", lineHeight: 1.5 }}>
                {quiz.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Badges */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingTop: "4px" }}>
          {quiz.lesson_title && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#F1F5F9", color: "#334155", fontSize: "13px", fontWeight: "600" }}>
              <BookOpen size={14} color="#64748B" /> {quiz.lesson_title}
            </span>
          )}
          {quiz.quiz_level_name && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#F1EDFF", color: "#6C4BFF", fontSize: "13px", fontWeight: "600" }}>
              <Layers size={14} color="#6C4BFF" /> Level: {quiz.quiz_level_name}
            </span>
          )}
          {quiz.difficulty_name && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#EEF4FB", color: "#126BFF", fontSize: "13px", fontWeight: "600" }}>
              Difficulty: {quiz.difficulty_name}
            </span>
          )}
          {quiz.order != null && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", fontSize: "13px", fontWeight: "600" }}>
              Order: #{quiz.order}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", fontSize: "13px", fontWeight: "600" }}>
            <HelpCircle size={14} color="#64748B" /> {questionsList.length} Questions
          </span>
          {quiz.pass_mark != null && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#ECFDF5", color: "#059669", fontSize: "13px", fontWeight: "600" }}>
              <Award size={14} color="#059669" /> Pass Mark: {quiz.pass_mark}%
            </span>
          )}
          {quiz.estimated_time_minutes != null && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: "#FFF7ED", color: "#D97706", fontSize: "13px", fontWeight: "600" }}>
              <Clock size={14} color="#D97706" /> {quiz.estimated_time_minutes} min
            </span>
          )}
        </div>
      </div>

      {/* Questions Header & Quick Index Toolbar */}
      {questionsList.length > 0 && (
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4ECF6",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          padding: "16px 20px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "14px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0B1F3A" }}>
              All Questions ({questionsList.length})
            </h3>
            <span style={{ fontSize: "13px", color: "#5D78A3" }}>
              (Correct answers highlighted in green)
            </span>
          </div>

          {/* Jump Index Pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#8CA3C7", marginRight: "4px" }}>Jump to:</span>
            {questionsList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToQuestion(idx + 1)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: activeQuestionId === idx + 1 ? "1.5px solid #126BFF" : "1px solid #DCE6F3",
                  backgroundColor: activeQuestionId === idx + 1 ? "#EEF4FB" : "#FFFFFF",
                  color: activeQuestionId === idx + 1 ? "#126BFF" : "#3D5E8A",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s"
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Questions List */}
      {questionsList.length === 0 ? (
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          padding: "48px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px"
        }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "#F1EDFF", color: "#6C4BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={26} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              No questions have been added to this quiz yet.
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3" }}>
              Return to the Edit Quiz page to add questions to your question bank.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
            style={{
              height: "40px",
              padding: "0 20px",
              borderRadius: "9px",
              border: "none",
              backgroundColor: "#126BFF",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "6px"
            }}
          >
            Return to Edit Quiz
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {questionsList.map((q, idx) => {
            const qNumber = idx + 1;
            const skillName = q.skill ? skillsMap[q.skill] || `Skill #${q.skill}` : null;
            const qTypeLabel =
              q.question_type === "NUMERIC" || q.question_type === "Short Answer"
                ? "Short Answer"
                : q.question_type === "True / False"
                ? "True / False"
                : "Multiple Choice";

            const isNumeric = q.question_type === "NUMERIC" || q.question_type === "Short Answer" || q.question_type === "Fill in the Blank";

            return (
              <div 
                id={`question-card-${qNumber}`}
                key={q.id || idx} 
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E4ECF6",
                  borderRadius: "16px",
                  boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px"
                }}
              >
                {/* Question Header & Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid #F1F5F9", paddingBottom: "14px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      backgroundColor: "#F1EDFF",
                      color: "#6C4BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "700",
                      flexShrink: 0
                    }}>
                      {qNumber}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#0B1F3A" }}>
                      Question {qNumber} of {questionsList.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {skillName && (
                      <span style={{ padding: "4px 10px", borderRadius: "14px", backgroundColor: "#EEF4FB", color: "#126BFF", fontSize: "12px", fontWeight: "600" }}>
                        Skill: {skillName}
                      </span>
                    )}
                    <span style={{ padding: "4px 10px", borderRadius: "14px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", fontSize: "12px", fontWeight: "500" }}>
                      {qTypeLabel}
                    </span>
                    {q.points != null && (
                      <span style={{ padding: "4px 10px", borderRadius: "14px", backgroundColor: "#F1F5F9", color: "#334155", fontSize: "12px", fontWeight: "600" }}>
                        {q.points} {q.points === 1 ? "Point" : "Points"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0B1F3A", lineHeight: 1.5 }}>
                    {q.question_text}
                  </h4>
                </div>

                {/* Options / Answer Display */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                  {isNumeric ? (
                    /* Numeric / Short Answer Display */
                    <div style={{
                      padding: "14px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#E9FBF4",
                      border: "1px solid #A8E8CE",
                      color: "#117A52",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <CheckCircle2 size={18} color="#117A52" />
                        <span>Expected Answer: <strong>{q.correct_value || "(No value specified)"}</strong></span>
                      </div>
                      <span style={{ fontSize: "12px", backgroundColor: "#117A52", color: "#FFFFFF", padding: "3px 10px", borderRadius: "12px" }}>
                        Correct Answer
                      </span>
                    </div>
                  ) : (
                    /* Multiple Choice & True/False Display */
                    (q.answers || []).map((ans, aIdx) => {
                      const isCorrect = ans.is_correct;
                      return (
                        <div
                          key={ans.id || aIdx}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            backgroundColor: isCorrect ? "#E9FBF4" : "#F8FAFC",
                            border: isCorrect ? "1px solid #A8E8CE" : "1px solid #E2E8F0",
                            color: isCorrect ? "#117A52" : "#334155",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            fontSize: "14px",
                            fontWeight: isCorrect ? "600" : "500",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {isCorrect ? (
                              <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#117A52", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CheckCircle2 size={14} />
                              </div>
                            ) : (
                              <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1.5px solid #CBD5E1", flexShrink: 0 }} />
                            )}
                            <span>{ans.answer_text}</span>
                          </div>

                          {isCorrect && (
                            <span style={{
                              fontSize: "12px",
                              backgroundColor: "#117A52",
                              color: "#FFFFFF",
                              padding: "2px 10px",
                              borderRadius: "12px",
                              fontWeight: "600",
                              flexShrink: 0
                            }}>
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hint Section (if available) */}
                {q.hints && q.hints.length > 0 && (
                  <div style={{
                    marginTop: "6px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#F1EDFF",
                    border: "1px solid #D8CFFF",
                    color: "#6C4BFF",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "13px"
                  }}>
                    <Lightbulb size={16} color="#6C4BFF" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong style={{ display: "block", marginBottom: "2px" }}>Hint:</strong>
                      {q.hints.map((h: any, hIdx: number) => (
                        <span key={hIdx}>{typeof h === "string" ? h : h.hint_text || JSON.stringify(h)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation Section (if available) */}
                {q.explanation && (
                  <div style={{
                    marginTop: "6px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                    color: "#0369A1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "13px"
                  }}>
                    <Info size={16} color="#0369A1" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong style={{ display: "block", marginBottom: "2px" }}>Explanation:</strong>
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherQuizPreview;
