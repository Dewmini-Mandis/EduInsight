import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";

type AnswerOption = {
  answer_text: string;
  is_correct: boolean;
};

type QuestionForm = {
  question_text: string;
  question_type: "MCQ" | "True / False" | "Short Answer" | "Fill in the Blank" | "Matching";
  difficulty_level: "Easy" | "Medium" | "Hard";
  answers: AnswerOption[];
  correct_value: string;
  points: number;
};

const Card = ({ children, style }: any) => (
  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", ...style }}>
    {children}
  </div>
);

const CardTitle = ({ title, icon }: any) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>
    {icon}
    {title}
  </div>
);

const Label = ({ children }: any) => (
  <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "6px" }}>{children}</div>
);

const Input = ({ ...props }: any) => (
  <input style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} {...props} />
);

const Select = ({ children, ...props }: any) => (
  <select style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b", backgroundColor: "#fff" }} {...props}>
    {children}
  </select>
);

const SegmentedControl = ({ options, value, onChange }: any) => (
  <div style={{ display: "flex", borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden", backgroundColor: "#f8fafc" }}>
    {options.map((opt: string) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          flex: 1, padding: "8px", border: "none", borderRight: "1px solid #e2e8f0",
          backgroundColor: value === opt ? "#e0e7ff" : "transparent",
          color: value === opt ? "#4338ca" : "#64748b",
          fontSize: "12px", fontWeight: "600", cursor: "pointer",
          outline: "none"
        }}
      >
        {opt}
      </button>
    ))}
  </div>
);

const Toggle = ({ checked, onChange, label }: any) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => onChange(!checked)}>
    <div style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: checked ? "#3b82f6" : "#cbd5e1", position: "relative", transition: "all 0.2s" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: checked ? "18px" : "2px", transition: "all 0.2s" }} />
    </div>
    <span style={{ fontSize: "13px", color: "#475569" }}>{label}</span>
  </div>
);

const CreateQuiz = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];

  const [fieldErrors, setFieldErrors] = useState<any>({});

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [academicTerm, setAcademicTerm] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topic, setTopic] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  
  const [level, setLevel] = useState("Beginner");
  const [difficulty, setDifficulty] = useState("Easy");
  const [enableHints, setEnableHints] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [passMark, setPassMark] = useState("70");

  const [assignTo, setAssignTo] = useState(teacherClassrooms.length > 0 ? teacherClassrooms[0] : "");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleQuiz, setScheduleQuiz] = useState(true);
  const [releaseTime, setReleaseTime] = useState("");
  const [attemptLimit, setAttemptLimit] = useState("");

  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [autoGrade, setAutoGrade] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [allowReview, setAllowReview] = useState(true);

  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Metadata arrays
  const [termsList, setTermsList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [quizLevels, setQuizLevels] = useState<any[]>([]);
  const [diffLevels, setDiffLevels] = useState<any[]>([]);
  
  // Field states
  const [termId, setTermId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [quizLevelId, setQuizLevelId] = useState("");
  const [diffLevelId, setDiffLevelId] = useState("");

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [termRes, qlRes, dlRes] = await Promise.all([
        fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/quiz-levels/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/difficulty-levels/", { headers: { Authorization: `Token ${token}` } }),
      ]);
      if (termRes.ok) setTermsList(await termRes.json());
      if (qlRes.ok) setQuizLevels(await qlRes.json());
      if (dlRes.ok) setDiffLevels(await dlRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!termId) {
      setLessons([]);
      setLessonId("");
      return;
    }
    const fetchFilteredLessons = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/lessons/?term=${termId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) setLessons(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchFilteredLessons();
  }, [termId]);

  useEffect(() => {
    if (!lessonId) {
      setTopicsList([]);
      setTopicId("");
      return;
    }
    const fetchFilteredTopics = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/topics/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) setTopicsList(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchFilteredTopics();
  }, [lessonId]);

  useEffect(() => {
    if (!topicId) {
      setSkillsList([]);
      setSkillId("");
      return;
    }
    const fetchFilteredSkills = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/skills/?topic=${topicId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) setSkillsList(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchFilteredSkills();
  }, [topicId]);

  const handlePublish = async () => {
    const token = getToken();
    if (!token) return;

    const errors: any = {};
    if (!title.trim()) errors.title = "Quiz Title is required.";
    if (!assignTo) errors.assignTo = "Please select a class to assign.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    setError("");

    // Map UI questions to backend format
    const formattedQuestions = questions.map((q) => {
      let qType = "MCQ";
      if (q.question_type === "Short Answer" || q.question_type === "Fill in the Blank") {
        qType = "NUMERIC";
      }

      const answers = qType === "MCQ" ? q.answers : [];
      const correctValue = qType === "NUMERIC" ? q.correct_value : undefined;

      return {
        question_text: q.question_text,
        question_type: qType,
        difficulty_level: q.difficulty_level,
        answers: answers,
        correct_value: correctValue,
        hints: [],
      };
    });

    const payload = {
      title,
      description,
      lesson: lessonId ? parseInt(lessonId) : null,
      topic: topicId ? parseInt(topicId) : null,
      skill: skillId ? parseInt(skillId) : null,
      quiz_level: quizLevelId ? parseInt(quizLevelId) : null,
      difficulty: diffLevelId ? parseInt(diffLevelId) : null,
      pass_mark: parseInt(passMark) || 50,
      estimated_time_minutes: parseInt(estimatedTime) || 10,
      max_attempts: parseInt(attemptLimit) || 3,
      questions: formattedQuestions,
    };

    try {
      const res = await fetch("/api/quizzes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(JSON.stringify(errData));
      }

      navigate("/teacher/quizzes");
    } catch (err: any) {
      setError(err.message || "Failed to create quiz.");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_type: "MCQ",
        difficulty_level: "Medium",
        answers: [
          { answer_text: "", is_correct: true },
          { answer_text: "", is_correct: false }
        ],
        correct_value: "",
        points: 1
      }
    ]);
  };



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif' }}>
      {/* Back Button */}
      <div>
        <button 
          onClick={() => navigate("/teacher/quizzes")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Quizzes
        </button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      
      {/* Top Row Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
        
        {/* 1. Quiz Details */}
        <Card>
          <CardTitle 
            title="1. Quiz Details" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} 
          />
          <div>
            <Label>Quiz Title <span style={{ color: "red" }}>*</span></Label>
            <Input value={title} onChange={(e: any) => { setTitle(e.target.value); setFieldErrors({...fieldErrors, title: null}); }} />
            {fieldErrors.title && <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>{fieldErrors.title}</span>}
          </div>
          <div>
            <Label>Short Description</Label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b", minHeight: "60px", resize: "none" }}
            />
            <div style={{ textAlign: "right", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{description.length} / 150</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <Label>Academic Term</Label>
              <Select value={termId} onChange={(e: any) => setTermId(e.target.value)}>
                <option value="">Select Term</option>
                {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Lesson</Label>
              <Select value={lessonId} onChange={(e: any) => setLessonId(e.target.value)} disabled={!termId}>
                <option value="">Select Lesson</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Topic</Label>
              <Select value={topicId} onChange={(e: any) => setTopicId(e.target.value)} disabled={!lessonId}>
                <option value="">Select Topic</option>
                {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Skill</Label>
              <Select value={skillId} onChange={(e: any) => setSkillId(e.target.value)} disabled={!topicId}>
                <option value="">Select Skill</option>
                {skillsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Estimated Time</Label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ position: "relative", width: "100px" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <input type="number" value={estimatedTime} onChange={(e: any) => setEstimatedTime(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>min</span>
            </div>
          </div>
        </Card>

        {/* 2. Difficulty & Progression */}
        <Card>
          <CardTitle 
            title="2. Difficulty & Progression" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#8b5cf6"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>} 
          />
          <div>
            <Label>Level</Label>
            <Select value={quizLevelId} onChange={(e: any) => setQuizLevelId(e.target.value)}>
                <option value="">Select Level</option>
                {quizLevels.map(ql => <option key={ql.id} value={ql.id}>{ql.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={diffLevelId} onChange={(e: any) => setDiffLevelId(e.target.value)}>
                <option value="">Select Difficulty</option>
                {diffLevels.map(dl => <option key={dl.id} value={dl.id}>{dl.name}</option>)}
            </Select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            <Toggle checked={enableHints} onChange={setEnableHints} label="Enable hints during quiz" />
            <Toggle checked={shuffleAnswers} onChange={setShuffleAnswers} label="Shuffle answers" />
          </div>

          <div style={{ marginTop: "auto" }}>
            <Label>Pass Mark (%)</Label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <input type="number" value={passMark} onChange={(e: any) => setPassMark(e.target.value)} style={{ width: "100%", padding: "8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "13px" }}>%</div>
            </div>
          </div>
        </Card>

        {/* 3. Assignment & Availability */}
        <Card>
          <CardTitle 
            title="3. Assignment & Availability" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#6366f1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} 
          />
          <div>
            <Label>Assign to <span style={{ color: "red" }}>*</span></Label>
            {teacherClassrooms.length > 0 ? (
              <Select value={assignTo} onChange={(e: any) => { setAssignTo(e.target.value); setFieldErrors({...fieldErrors, assignTo: null}); }}>
                <option value="">Select class</option>
                {teacherClassrooms.map((cls: string) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </Select>
            ) : (
              <Input 
                value={assignTo} 
                onChange={(e: any) => { setAssignTo(e.target.value); setFieldErrors({...fieldErrors, assignTo: null}); }} 
                placeholder="Enter class name (or configure in Profile)" 
              />
            )}
            {fieldErrors.assignTo && <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>{fieldErrors.assignTo}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Start Date</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} />
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <input type="date" value={dueDate} onChange={(e: any) => setDueDate(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} />
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>Schedule Quiz</span>
            <div onClick={() => setScheduleQuiz(!scheduleQuiz)} style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: scheduleQuiz ? "#22c55e" : "#cbd5e1", position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: scheduleQuiz ? "18px" : "2px", transition: "all 0.2s" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", opacity: scheduleQuiz ? 1 : 0.5, pointerEvents: scheduleQuiz ? "auto" : "none" }}>
            <div>
              <Label>Release Time</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <input type="time" value={releaseTime} onChange={(e: any) => setReleaseTime(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
            </div>
            <div>
              <Label>Attempt Limit</Label>
              <div style={{ position: "relative" }}>
                <input type="number" value={attemptLimit} onChange={(e: any) => setAttemptLimit(e.target.value)} style={{ width: "100%", padding: "8px 50px 8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
                <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "12px" }}>attempts</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Questions Builder */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <CardTitle 
              title="4. Questions Builder" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} 
            />
            <div style={{ fontSize: "13px", color: "#64748b" }}>Add, edit and organize questions for your quiz.</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "600", backgroundColor: "#eff6ff", padding: "6px 12px", borderRadius: "16px" }}>Total Questions: {questions.length}</span>

            <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#3b82f6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Questions
            </button>
            <button onClick={addQuestion} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Question
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
          {["All Types", ...Array.from(new Set(questions.map(q => q.question_type)))].map(type => (
            <button key={type} style={{ padding: "6px 12px", borderRadius: "16px", border: "none", backgroundColor: type === "All Types" ? "#eff6ff" : "transparent", color: type === "All Types" ? "#3b82f6" : "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
              {type}
            </button>
          ))}
        </div>

        {/* Questions List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {questions.map((q, idx) => (
            <div key={idx} style={{ display: "flex", gap: "16px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                  {idx + 1}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <select
                    value={q.question_type}
                    onChange={(e: any) => {
                      const newQ = [...questions];
                      newQ[idx].question_type = e.target.value;
                      if (e.target.value === "True / False") {
                        newQ[idx].answers = [{ answer_text: "True", is_correct: true }, { answer_text: "False", is_correct: false }];
                      }
                      setQuestions(newQ);
                    }}
                    style={{ backgroundColor: q.question_type === "MCQ" ? "#f3e8ff" : q.question_type === "True / False" ? "#e0f2fe" : "#fef3c7", color: q.question_type === "MCQ" ? "#9333ea" : q.question_type === "True / False" ? "#0284c7" : "#d97706", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", border: "none", outline: "none", cursor: "pointer" }}
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="True / False">True / False</option>
                    <option value="Short Answer">Short Answer</option>
                    <option value="Fill in the Blank">Fill in the Blank</option>
                    <option value="Matching">Matching</option>
                  </select>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{q.points} points</span>
                </div>
                
                {q.question_type === "MCQ" || q.question_type === "True / False" ? (
                  <div style={{ display: "flex" }}>
                    <div style={{ flex: 1 }}>
                      <input 
                        value={q.question_text}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[idx].question_text = e.target.value;
                          setQuestions(newQ);
                        }}
                        placeholder="Question text"
                        style={{ width: "100%", padding: "8px", border: "none", outline: "none", fontSize: "14px", fontWeight: "500", color: "#1e293b" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div 
                            onClick={() => {
                              const newQ = [...questions];
                              newQ[idx].answers.forEach((ans, i) => {
                                ans.is_correct = i === aIdx;
                              });
                              setQuestions(newQ);
                            }}
                            style={{ width: "16px", height: "16px", borderRadius: "50%", border: a.is_correct ? "5px solid #22c55e" : "1px solid #cbd5e1", cursor: "pointer", flexShrink: 0 }} 
                          />
                          <input 
                            value={a.answer_text}
                            onChange={(e) => {
                              const newQ = [...questions];
                              newQ[idx].answers[aIdx].answer_text = e.target.value;
                              setQuestions(newQ);
                            }}
                            placeholder="Answer"
                            style={{ border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "6px", outline: "none", fontSize: "13px", color: "#475569", width: "100%" }}
                          />
                          <button
                            onClick={() => {
                              const newQ = [...questions];
                              newQ[idx].answers.splice(aIdx, 1);
                              setQuestions(newQ);
                            }}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      {q.question_type === "MCQ" && (
                        <button 
                          onClick={() => {
                            const newQ = [...questions];
                            newQ[idx].answers.push({ answer_text: "", is_correct: newQ[idx].answers.length === 0 });
                            setQuestions(newQ);
                          }}
                          style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#3b82f6", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "4px 0" }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Add Option
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex" }}>
                     <div style={{ flex: 1 }}>
                      <input 
                        value={q.question_text}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[idx].question_text = e.target.value;
                          setQuestions(newQ);
                        }}
                        placeholder="Question text"
                        style={{ width: "100%", padding: "8px", border: "none", outline: "none", fontSize: "14px", fontWeight: "500", color: "#1e293b" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>Expected answer:</span>
                      <input 
                        value={q.correct_value}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[idx].correct_value = e.target.value;
                          setQuestions(newQ);
                        }}
                        style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", outline: "none", flex: 1 }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "none", cursor: "pointer", color: "#64748b" }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "none", cursor: "pointer", color: "#64748b" }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button onClick={() => {
                  const newQ = [...questions];
                  newQ.splice(idx, 1);
                  setQuestions(newQ);
                }} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #fecaca", background: "none", cursor: "pointer", color: "#ef4444" }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
              No questions added yet. Click "Add Question" to begin.
            </div>
          )}
        </div>
      </Card>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* 5. Scoring & Settings */}
        <Card>
          <CardTitle 
            title="5. Scoring & Settings" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} 
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Toggle checked={randomizeOrder} onChange={setRandomizeOrder} label="Randomize question order" />
            <Toggle checked={showResults} onChange={setShowResults} label="Show results immediately" />
            <Toggle checked={autoGrade} onChange={setAutoGrade} label="Auto-grade objective questions" />
            <Toggle checked={allowReview} onChange={setAllowReview} label="Allow review after submission" />
          </div>
        </Card>

        {/* Quiz Summary */}
        <Card>
          <CardTitle 
            title="Quiz Summary" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} 
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", height: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{questions.length}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Questions</div>
            </div>
            <div style={{ width: "1px", height: "40px", backgroundColor: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{questions.reduce((sum, q) => sum + q.points, 0)}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Total Points</div>
            </div>
            <div style={{ width: "1px", height: "40px", backgroundColor: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{estimatedTime} min</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Estimated Time</div>
            </div>
            <div style={{ width: "1px", height: "40px", backgroundColor: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#22c55e" }}>{passMark}%</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Pass Mark</div>
            </div>
          </div>
        </Card>

      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
        <button style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #3b82f6", backgroundColor: "#fff", color: "#3b82f6", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          Save Draft
        </button>
        <button style={{ padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#eff6ff", color: "#3b82f6", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          Preview Quiz
        </button>
        <button onClick={handlePublish} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {loading ? "Publishing..." : "Publish Quiz"}
        </button>
      </div>

    </div>
  );
};

export default CreateQuiz;
