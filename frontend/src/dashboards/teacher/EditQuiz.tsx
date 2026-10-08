import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { FileText, ArrowLeft, Layers, Plus, Trash2, CheckCircle2, AlertCircle, X, Eye, GripVertical } from "lucide-react";
import SuccessBanner from "../../components/SuccessBanner";

type AnswerOption = {
  answer_text: string;
  is_correct: boolean;
};

type QuestionForm = {
  id?: number;
  skill: number;
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

const Select = ({ children, style, ...props }: any) => (
  <select style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b", backgroundColor: "#fff", ...style }} {...props}>
    {children}
  </select>
);

const Toggle = ({ checked, onChange, label }: any) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => onChange(!checked)}>
    <div style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: checked ? "#3b82f6" : "#cbd5e1", position: "relative", transition: "all 0.2s" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: checked ? "18px" : "2px", transition: "all 0.2s" }} />
    </div>
    <span style={{ fontSize: "13px", color: "#475569" }}>{label}</span>
  </div>
);

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

const EditQuiz = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [activeSkills, setActiveSkills] = useState<any[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { quizId } = useParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [hoverBack, setHoverBack] = useState(false);
  const user = getUser() as any;

  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [hasStudentAttempts, setHasStudentAttempts] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteQuiz = async () => {
    if (!quizId) return;
    setDeleting(true);
    setDeleteError("");
    const token = getToken();
    try {
      const res = await fetch(`/api/quizzes/${quizId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Quiz deleted successfully.");
        setTimeout(() => {
          navigate("/teacher/quizzes");
        }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.detail || "Failed to delete quiz.");
      }
    } catch (err) {
      setDeleteError("Error connecting to server.");
    } finally {
      setDeleting(false);
    }
  };

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusVal, setStatusVal] = useState("PUBLISHED");
  const [lessonId, setLessonId] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  const [enableHints, setEnableHints] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [passMark, setPassMark] = useState("70");

  const initialClassrooms = user?.teacher_profile?.classrooms || [];
  const [teacherClassrooms, setTeacherClassrooms] = useState<any[]>(initialClassrooms);
  const [selectedClasses, setSelectedClasses] = useState<{ id: any; name: string }[]>([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [modalClassError, setModalClassError] = useState("");

  const [assignTo, setAssignTo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleQuiz, setScheduleQuiz] = useState(true);
  const [releaseTime, setReleaseTime] = useState("");
  const [attemptLimit, setAttemptLimit] = useState("1");

  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [autoGrade, setAutoGrade] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [allowReview, setAllowReview] = useState(true);

  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Metadata arrays
  const [termsList, setTermsList] = useState<any[]>([]);
  const [quizLevels, setQuizLevels] = useState<any[]>([]);
  const [diffLevels, setDiffLevels] = useState<any[]>([]);

  // Field states
  const [termId, setTermId] = useState("");
  const [quizLevelId, setQuizLevelId] = useState("");
  const [diffLevelId, setDiffLevelId] = useState("");
  const [order, setOrder] = useState("1");
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    fetchMetadataAndQuiz();
  }, [quizId]);

  useEffect(() => {
    if (!order || isNaN(Number(order))) {
      setOrderError("Order number must be a positive whole number.");
      return;
    }
    const num = Number(order);
    if (!Number.isInteger(num) || num < 1) {
      setOrderError("Order number must be a positive whole number.");
      return;
    }

    if (!lessonId || !quizLevelId || !diffLevelId) {
      setOrderError("");
      return;
    }

    const token = getToken();
    if (!token) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/quizzes/check_order/?lesson=${lessonId}&quiz_level=${quizLevelId}&difficulty=${diffLevelId}&order=${order}&exclude_id=${quizId}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setOrderError("A quiz already exists at this order for the selected lesson, level, and difficulty. Please choose a different order number.");
          } else {
            setOrderError("");
          }
        }
      } catch (e) {
        console.error("Order check error", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [lessonId, quizLevelId, diffLevelId, order, quizId]);

  const fetchMetadataAndQuiz = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [termRes, qlRes, dlRes, quizRes, attemptRes, classRes] = await Promise.all([
        fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/quiz-levels/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/difficulty-levels/", { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/${quizId}/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/attempts/?quiz=${quizId}`, { headers: { Authorization: `Token ${token}` } }).catch(() => null),
        fetch("/api/classes/classrooms/", { headers: { Authorization: `Token ${token}` } }).catch(() => null),
      ]);
      if (termRes.ok) {
        const data = await termRes.json();
        setTermsList(Array.isArray(data) ? data : data.results || []);
      }
      if (qlRes.ok) {
        const data = await qlRes.json();
        setQuizLevels(Array.isArray(data) ? data : data.results || []);
      }
      if (dlRes.ok) {
        const data = await dlRes.json();
        setDiffLevels(Array.isArray(data) ? data : data.results || []);
      }
      if (classRes && classRes.ok) {
        const cData = await classRes.json();
        setTeacherClassrooms(Array.isArray(cData) ? cData : cData.results || []);
      }

      if (attemptRes && attemptRes.ok) {
        const attemptData = await attemptRes.json();
        const attemptsList = Array.isArray(attemptData) ? attemptData : attemptData.results || [];
        if (attemptsList.length > 0) {
          setHasStudentAttempts(true);
        }
      }

      if (quizRes.ok) {
        const quizData = await quizRes.json();
        setTitle(quizData.title || "");
        setDescription(quizData.description || "");
        setStatusVal(quizData.status || "PUBLISHED");
        const loadedLessonId = quizData.lesson ? quizData.lesson.toString() : "";
        setLessonId(loadedLessonId);

        let loadedTermId = "";
        if (quizData.lesson) {
          try {
            const lRes = await fetch(`/api/quizzes/lessons/${quizData.lesson}/`, { headers: { Authorization: `Token ${token}` } });
            if (lRes.ok) {
              const lData = await lRes.json();
              loadedTermId = lData.term ? lData.term.toString() : "";
            }
          } catch (e) { }
        }
        setTermId(loadedTermId);
        setQuizLevelId(quizData.quiz_level ? quizData.quiz_level.toString() : "");
        setDiffLevelId(quizData.difficulty ? quizData.difficulty.toString() : "");
        setOrder(quizData.order ? quizData.order.toString() : "1");
        setPassMark(quizData.pass_mark ? quizData.pass_mark.toString() : "50");
        setEstimatedTime(quizData.estimated_time_minutes ? quizData.estimated_time_minutes.toString() : "10");
        setAttemptLimit(quizData.max_attempts ? quizData.max_attempts.toString() : "1");

        let initialSelected: { id: any; name: string }[] = [];
        if (quizData.assigned_classes_details && quizData.assigned_classes_details.length > 0) {
          initialSelected = quizData.assigned_classes_details;
        } else if (quizData.assigned_class) {
          initialSelected = [{ id: quizData.assigned_class, name: quizData.assigned_class_name || `Class #${quizData.assigned_class}` }];
        }
        setSelectedClasses(initialSelected);

        // Fetch active skills for lesson
        let activeSkillList: any[] = [];
        if (loadedLessonId) {
          const sRes = await fetch(`/api/quizzes/skills/?lesson=${loadedLessonId}&active_only=true`, {
            headers: { Authorization: `Token ${token}` },
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            activeSkillList = Array.isArray(sData) ? sData : sData.results || [];
            setActiveSkills(activeSkillList);
          }
        }

        // Extract skills and map questions
        const extractedSkillIds = new Set<number>();
        if (quizData.skill) extractedSkillIds.add(Number(quizData.skill));

        const mappedQuestions: QuestionForm[] = (quizData.questions || []).map((q: any) => {
          let qType = q.question_type;
          if (qType === "NUMERIC") qType = "Short Answer";
          const qSkill = q.skill || quizData.skill || (activeSkillList.length > 0 ? activeSkillList[0].id : 0);
          if (qSkill) extractedSkillIds.add(Number(qSkill));

          return {
            id: q.id,
            skill: Number(qSkill),
            question_text: q.question_text || "",
            question_type: qType,
            difficulty_level: q.difficulty_level || "Medium",
            answers: q.answers || [],
            correct_value: q.correct_value || "",
            points: q.points || 1
          };
        });

        setSelectedSkillIds(Array.from(extractedSkillIds));
        setQuestions(mappedQuestions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectClass = (cIdVal: string) => {
    if (!cIdVal) return;
    const found = teacherClassrooms.find((c: any) => (c.id?.toString() || c.toString()) === cIdVal);
    const cId = found?.id || cIdVal;
    const cName = found?.name || cIdVal;
    if (!selectedClasses.some(sc => sc.id === cId || sc.name === cName)) {
      setSelectedClasses(prev => [...prev, { id: cId, name: cName }]);
      setFieldErrors((prev: any) => ({ ...prev, assignTo: null }));
    }
  };

  const handleRemoveClass = (cId: any) => {
    setSelectedClasses(prev => prev.filter(sc => sc.id !== cId));
  };

  const handleAddClassFromModal = async () => {
    if (!newClassName.trim()) return;
    setAddingClass(true);
    setModalClassError("");
    const token = getToken();
    try {
      const res = await fetch("/api/classes/classrooms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ name: newClassName.trim() })
      });
      if (res.ok) {
        const createdClass = await res.json();
        const newClassObj = { id: createdClass.id, name: createdClass.name };
        setTeacherClassrooms(prev => prev.some(c => c.id === newClassObj.id) ? prev : [...prev, newClassObj]);
        setSelectedClasses(prev => prev.some(c => c.id === newClassObj.id) ? prev : [...prev, newClassObj]);
        setNewClassName("");
        setShowAddClassModal(false);
        setFieldErrors((prev: any) => ({ ...prev, assignTo: null }));
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalClassError(errData?.detail || errData?.name?.[0] || "Failed to create class.");
      }
    } catch (err) {
      console.error("Error creating class", err);
      setModalClassError("Unable to connect to server.");
    } finally {
      setAddingClass(false);
    }
  };

  useEffect(() => {
    if (!termId) {
      setLessons([]);
      return;
    }
    const fetchFilteredLessons = async () => {
      const token = getToken();
      setLessonsLoading(true);
      try {
        const res = await fetch(`/api/quizzes/lessons/?term=${termId}`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setLessons(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) { console.error(err); } finally {
        setLessonsLoading(false);
      }
    };
    fetchFilteredLessons();
  }, [termId]);

  const fetchActiveSkillsForLesson = async (lId: string) => {
    if (!lId) {
      setActiveSkills([]);
      setSelectedSkillIds([]);
      setQuestions([]);
      return;
    }
    const token = getToken();
    setSkillsLoading(true);
    try {
      const res = await fetch(`/api/quizzes/skills/?lesson=${lId}&active_only=true`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setActiveSkills(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleLessonChange = (newLessonId: string) => {
    if (newLessonId === lessonId) return;

    if (hasStudentAttempts) {
      alert("This quiz already has historical student attempts. Changing the lesson is restricted to protect student records.");
      return;
    }

    if ((selectedSkillIds.length > 0 || questions.length > 0) && lessonId) {
      const confirmed = window.confirm(
        "Changing the lesson will remove selected skills and their unsaved questions. Do you want to continue?"
      );
      if (!confirmed) return;
    }

    setLessonId(newLessonId);
    setSelectedSkillIds([]);
    setQuestions([]);
    setFieldErrors({ ...fieldErrors, lessonId: null });
    fetchActiveSkillsForLesson(newLessonId);
  };

  const handleToggleSkill = (skillIdNum: number) => {
    const isSelected = selectedSkillIds.includes(skillIdNum);
    if (isSelected) {
      const questionsForSkill = questions.filter((q) => q.skill === skillIdNum);
      if (questionsForSkill.length > 0) {
        if (hasStudentAttempts) {
          alert("This skill contains questions associated with student attempts and cannot be removed.");
          return;
        }
        const confirmed = window.confirm(
          "Removing this skill will also remove its unsaved questions from this quiz."
        );
        if (!confirmed) return;
      }
      setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skillIdNum));
      setQuestions(questions.filter((q) => q.skill !== skillIdNum));
    } else {
      setSelectedSkillIds([...selectedSkillIds, skillIdNum]);
    }
  };

  const parsedAttempts = Math.max(1, parseInt(attemptLimit) || 1);
  const requiredQuestionsPerSkill = 10 * (parsedAttempts + 1);

  const validateSkillRequirements = (): { isValid: boolean; errorMsg?: string } => {
    if (!lessonId) {
      return { isValid: false, errorMsg: "Please select a Lesson." };
    }
    if (selectedSkillIds.length === 0) {
      return { isValid: false, errorMsg: "Please select at least one Skill." };
    }
    for (const skId of selectedSkillIds) {
      const count = questions.filter((q) => q.skill === skId).length;
      const skObj = activeSkills.find((s) => s.id === skId);
      const skName = skObj ? skObj.name : `Skill #${skId}`;
      if (count < requiredQuestionsPerSkill) {
        return {
          isValid: false,
          errorMsg: `Skill "${skName}" requires ${requiredQuestionsPerSkill} questions (currently ${count}/${requiredQuestionsPerSkill}).`,
        };
      }
    }
    return { isValid: true };
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;

    const errors: any = {};
    if (!title.trim()) errors.title = "Quiz Title is required.";
    if (selectedClasses.length === 0) errors.assignTo = "Please select or add at least one assigned class.";
    if (!lessonId) errors.lessonId = "Lesson is required.";
    if (orderError) errors.order = orderError;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const reqValidation = validateSkillRequirements();
    if (!reqValidation.isValid) {
      setError(reqValidation.errorMsg || "Question bank requirement not satisfied.");
      return;
    }

    setLoading(true);
    setError("");

    const formattedQuestions = questions.map((q) => {
      let qType = "MCQ";
      if (q.question_type === "Short Answer" || q.question_type === "Fill in the Blank") {
        qType = "NUMERIC";
      }

      return {
        id: q.id,
        skill: q.skill,
        question_text: q.question_text,
        question_type: qType,
        difficulty_level: q.difficulty_level,
        answers: qType === "MCQ" ? q.answers : [],
        correct_value: qType === "NUMERIC" ? q.correct_value : undefined,
        hints: [],
      };
    });

    const classIds = selectedClasses.map(c => typeof c.id === 'number' ? c.id : parseInt(c.id)).filter(Boolean);

    const payload = {
      title,
      description,
      status: "PUBLISHED",
      lesson: lessonId ? parseInt(lessonId) : null,
      skill: selectedSkillIds.length > 0 ? selectedSkillIds[0] : null,
      quiz_level: quizLevelId ? parseInt(quizLevelId) : null,
      difficulty: diffLevelId ? parseInt(diffLevelId) : null,
      order: parseInt(order) || 1,
      pass_mark: parseInt(passMark) || 50,
      estimated_time_minutes: parseInt(estimatedTime) || 10,
      max_attempts: parsedAttempts,
      assigned_class: classIds.length > 0 ? classIds[0] : null,
      assigned_classes: classIds,
      questions: formattedQuestions,
    };

    try {
      const res = await fetch(`/api/quizzes/${quizId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || "Unable to save quiz. Please try again.");
      }

      setStatusVal("PUBLISHED");
      setSuccessMsg(statusVal === "DRAFT" ? "Quiz published successfully." : "Quiz updated successfully.");
      setTimeout(() => {
        navigate(`/teacher/quizzes/${quizId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Unable to update quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!lessonId) {
      setFieldErrors((prev: any) => ({
        ...prev,
        lessonId: "Lesson is required to save a draft."
      }));
      const lessonElem = document.getElementById("lesson-select");
      if (lessonElem) {
        lessonElem.scrollIntoView({ behavior: "smooth", block: "center" });
        lessonElem.focus();
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    setSavingDraft(true);
    setError("");
    setFieldErrors((prev: any) => ({ ...prev, lessonId: null }));

    const formattedQuestions = questions.map((q) => {
      let qType = "MCQ";
      if (q.question_type === "Short Answer" || q.question_type === "Fill in the Blank") {
        qType = "NUMERIC";
      }
      return {
        id: q.id,
        skill: q.skill,
        question_text: q.question_text || "",
        question_type: qType,
        difficulty_level: q.difficulty_level || "Medium",
        answers: qType === "MCQ" ? q.answers.map(a => ({ answer_text: a.answer_text || "", is_correct: Boolean(a.is_correct) })) : [],
        correct_value: qType === "NUMERIC" ? (q.correct_value || "") : undefined,
        hints: [],
      };
    });

    const classIds = selectedClasses.map(c => typeof c.id === 'number' ? c.id : parseInt(c.id)).filter(Boolean);

    // If quiz is currently PUBLISHED, retain PUBLISHED status; if DRAFT, keep DRAFT
    const targetStatus = statusVal === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    const payload = {
      title: title.trim() || "Untitled Quiz Draft",
      description,
      status: targetStatus,
      lesson: parseInt(lessonId),
      skill: selectedSkillIds.length > 0 ? selectedSkillIds[0] : null,
      quiz_level: quizLevelId ? parseInt(quizLevelId) : null,
      difficulty: diffLevelId ? parseInt(diffLevelId) : null,
      order: parseInt(order) || 1,
      pass_mark: parseInt(passMark) || 50,
      estimated_time_minutes: parseInt(estimatedTime) || 10,
      max_attempts: parsedAttempts,
      assigned_class: classIds.length > 0 ? classIds[0] : null,
      assigned_classes: classIds,
      questions: formattedQuestions,
    };

    try {
      const res = await fetch(`/api/quizzes/${quizId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.lesson) {
          const msg = Array.isArray(errData.lesson) ? errData.lesson[0] : errData.lesson;
          setFieldErrors((prev: any) => ({ ...prev, lessonId: msg }));
          const lessonElem = document.getElementById("lesson-select");
          if (lessonElem) {
            lessonElem.scrollIntoView({ behavior: "smooth", block: "center" });
            lessonElem.focus();
          }
          throw new Error(msg);
        }
        throw new Error(errData.detail || errData.message || "Unable to save quiz draft. Please try again.");
      }

      setSuccessMsg("Quiz draft saved successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to save quiz draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  const addQuestionToSkill = (skId: number) => {
    const targetIdx = questions.filter((q) => q.skill === skId).length;
    setQuestions((prev) => [
      ...prev,
      {
        skill: skId,
        question_text: "",
        question_type: "MCQ",
        difficulty_level: "Medium",
        answers: [
          { answer_text: "", is_correct: true },
          { answer_text: "", is_correct: false },
        ],
        correct_value: "",
        points: 1,
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(`q-card-${skId}-${targetIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const canSave = validateSkillRequirements().isValid && !orderError;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif' }}>
      {/* Back Button & Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "13px", color: "#6F86A5" }}>
          Dashboard &gt; Quizzes &gt; <span style={{ fontWeight: "600", color: "#0B1F3A" }}>Edit Quiz</span>
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
              backgroundColor: "#F1EDFF",
              color: "#6C4BFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? "24px" : "30px", fontWeight: "700", color: "#0B1F3A", lineHeight: 1.2 }}>
                Edit Quiz
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3", fontWeight: "400" }}>
                Update quiz details, progression, questions, and availability.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto" }}>
            <button
              type="button"
              onClick={() => navigate(`/teacher/quizzes/${quizId}/preview`)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "42px",
                padding: "0 16px",
                borderRadius: "9px",
                border: "1px solid #126BFF",
                backgroundColor: "#FFFFFF",
                color: "#126BFF",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 150ms ease",
                width: isMobile ? "100%" : "auto"
              }}
            >
              <Eye size={16} strokeWidth={2.2} />
              Preview Quiz
            </button>

            <button
              type="button"
              onClick={() => { setShowDeleteModal(true); setDeleteError(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "42px",
                padding: "0 16px",
                borderRadius: "9px",
                border: "1px solid #FF4054",
                backgroundColor: "#FFF1F3",
                color: "#FF4054",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 150ms ease",
                width: isMobile ? "100%" : "auto"
              }}
            >
              <Trash2 size={16} />
              Delete Quiz
            </button>
          </div>
        </div>
      </div>

      {hasStudentAttempts && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} />
          Historical Protection Active: This quiz has existing student attempt records. Structural changes are protected.
        </div>
      )}

      {successMsg && (
        <SuccessBanner
          message={successMsg}
          onClose={() => setSuccessMsg("")}
        />
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Top Row Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "24px" }}>
        {/* 1. Basic Quiz Details Card */}
        <Card>
          <CardTitle
            title="1. Quiz Details"
            icon={<FileText size={16} color="#3b82f6" />}
          />
          <div>
            <Label>Quiz Title <span className="required-marker">*</span></Label>
            <Input value={title} onChange={(e: any) => { setTitle(e.target.value); setFieldErrors({ ...fieldErrors, title: null }); }} />
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
              <Select value={termId} onChange={(e: any) => { setTermId(e.target.value); handleLessonChange(""); }}>
                <option value="">Select Term</option>
                {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>

            <div>
              <Label>Lesson <span className="required-marker">*</span></Label>
              <Select
                id="lesson-select"
                value={lessonId}
                onChange={(e: any) => handleLessonChange(e.target.value)}
                disabled={!termId || hasStudentAttempts}
                style={fieldErrors.lessonId ? { borderColor: "#ef4444" } : undefined}
              >
                <option value="">{lessonsLoading ? "Loading..." : "Select Lesson"}</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
              {fieldErrors.lessonId && <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>{fieldErrors.lessonId}</span>}
            </div>
          </div>

          <div>
            <Label>Estimated Time</Label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ position: "relative", width: "100px" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <input type="number" value={estimatedTime} onChange={(e: any) => setEstimatedTime(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
              <span style={{ fontSize: "13px", color: "#64748b" }}>min</span>
            </div>
          </div>
        </Card>

        {/* 2. Difficulty & Progression Card */}
        <Card>
          <CardTitle
            title="2. Difficulty & Progression"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#8b5cf6"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>}
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
          <div>
            <Label>Order Number</Label>
            <input
              type="number"
              value={order}
              onChange={(e: any) => setOrder(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: orderError ? "1px solid #FF4054" : "1px solid #e2e8f0",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
              min="1"
              step="1"
            />
            {orderError && (
              <span style={{ color: "#FF4054", fontSize: "12px", marginTop: "4px", display: "block", lineHeight: "1.4" }}>
                {orderError}
              </span>
            )}
          </div>


          <div style={{ marginTop: "auto" }}>
            <Label>Pass Mark (%)</Label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <input type="number" value={passMark} onChange={(e: any) => setPassMark(e.target.value)} style={{ width: "100%", padding: "8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "13px" }}>%</div>
            </div>
          </div>
        </Card>

        {/* 3. Assignment & Availability Card */}
        <Card>
          <CardTitle
            title="3. Assignment & Availability"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#6366f1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <Label>Assign to <span className="required-marker">*</span></Label>
              <button
                type="button"
                onClick={() => setShowAddClassModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "none",
                  border: "none",
                  color: "#126BFF",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <Plus size={14} />
                Add New Class
              </button>
            </div>

            <Select
              value=""
              onChange={(e: any) => {
                handleSelectClass(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select class to assign...</option>
              {teacherClassrooms.map((cls: any) => (
                <option key={cls.id || cls} value={cls.id || cls}>{cls.name || cls}</option>
              ))}
            </Select>

            {/* Class Pills Display */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
              {selectedClasses.map((cls) => (
                <div
                  key={cls.id || cls.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#EEF4FB",
                    color: "#126BFF",
                    border: "1px solid #B8D5FF",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  <span>{cls.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cls.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#126BFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {selectedClasses.length === 0 && (
                <span style={{ fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>
                  No classes assigned yet. Select a class or add a new one above.
                </span>
              )}
            </div>

            {fieldErrors.assignTo && <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>{fieldErrors.assignTo}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Start Date</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </div>
                <input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", color: "#1e293b" }} />
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <input type="time" value={releaseTime} onChange={(e: any) => setReleaseTime(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
            </div>
            <div>
              <Label>Allowed Attempts</Label>
              <div style={{ position: "relative" }}>
                <input type="number" value={attemptLimit} onChange={(e: any) => setAttemptLimit(e.target.value)} min="1" style={{ width: "100%", padding: "8px 50px 8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }} />
                <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "12px" }}>attempts</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* SKILLS & QUESTIONS SECTION */}
      <Card>
        <CardTitle
          title="Skills & Questions Selection"
          icon={<Layers size={18} color="#6C4BFF" />}
        />
        <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#64748b" }}>
          Select active skills configured for the chosen lesson, and manage unique questions per skill.
        </p>

        {!lessonId ? (
          <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "14px" }}>
            Select a lesson first to view available skills.
          </div>
        ) : skillsLoading ? (
          <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "13px" }}>
            Loading skills for selected lesson...
          </div>
        ) : activeSkills.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#fff1f2", borderRadius: "8px", border: "1px solid #fecdd3", color: "#e11d48", fontSize: "13px", fontWeight: "500" }}>
            No skills have been configured for this lesson. Please contact the administrator.
          </div>
        ) : (
          <div>
            <Label>Available Active Skills for Selected Lesson</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
              {activeSkills.map((sk) => {
                const isSelected = selectedSkillIds.includes(sk.id);
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => handleToggleSkill(sk.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: isSelected ? "1px solid #6C4BFF" : "1px solid #e2e8f0",
                      backgroundColor: isSelected ? "#F1EDFF" : "#ffffff",
                      color: isSelected ? "#6C4BFF" : "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSelected ? <CheckCircle2 size={15} color="#6C4BFF" /> : <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "1px solid #94a3b8" }} />}
                    {sk.name}
                  </button>
                );
              })}
            </div>

            {selectedSkillIds.length > 0 && (
              <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: "12px", fontSize: "12px" }}>
                <div>Selected Skills: <strong style={{ color: "#0B1F3A" }}>{selectedSkillIds.length}</strong></div>
                <div>Questions per Skill / Assessment: <strong style={{ color: "#0B1F3A" }}>10</strong></div>
                <div>Assessment Size (per Attempt): <strong style={{ color: "#126BFF" }}>{selectedSkillIds.length * 10} Questions</strong></div>
                <div>Total Question Bank Required: <strong style={{ color: "#6C4BFF" }}>{selectedSkillIds.length * requiredQuestionsPerSkill} Questions</strong></div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* QUESTION CARDS GROUPED BY SKILL */}
      {selectedSkillIds.map((skId) => {
        const skObj = activeSkills.find((s) => s.id === skId);
        const skName = skObj ? skObj.name : `Skill #${skId}`;
        const skillQuestions = questions.filter((q) => q.skill === skId);
        const addedCount = skillQuestions.length;
        const isSatisfied = addedCount >= requiredQuestionsPerSkill;
        const missingCount = Math.max(0, requiredQuestionsPerSkill - addedCount);

        return (
          <Card key={skId} style={{ border: isSatisfied ? "1px solid #E4ECF6" : "1px solid #FECDD3" }}>
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: "16px",
              borderBottom: "1px solid #E4ECF6",
              paddingBottom: "18px"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={20} color="#6C4BFF" />
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                    Skill Question Bank: {skName}
                  </h3>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Questions per Assessment: <strong style={{ color: "#126BFF" }}>10</strong>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Allowed Attempts: <strong style={{ color: "#0B1F3A" }}>{parsedAttempts}</strong>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Reassessment Sets: <strong style={{ color: "#0B1F3A" }}>1</strong>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Required Question Bank: <strong style={{ color: "#6C4BFF" }}>{requiredQuestionsPerSkill}</strong>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Currently Added: <strong style={{ color: isSatisfied ? "#16A34A" : "#DC2626" }}>{addedCount}</strong>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#475569" }}>
                    Remaining: <strong style={{ color: missingCount > 0 ? "#DC2626" : "#16A34A" }}>{missingCount}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                <span style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  backgroundColor: isSatisfied ? "#F0FDF4" : "#FEF2F2",
                  color: isSatisfied ? "#16A34A" : "#DC2626",
                  border: `1px solid ${isSatisfied ? "#BBF7D0" : "#FECACA"}`,
                  whiteSpace: "nowrap"
                }}>
                  {isSatisfied ? "Status: Ready" : `${missingCount} more question(s) required`}
                </span>
              </div>
            </div>

            {/* Questions List for this Skill - Vertical Card Layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "18px" }}>
              {skillQuestions.map((q, idx) => {
                const globalIndex = questions.indexOf(q);
                return (
                  <div
                    key={idx}
                    id={`q-card-${skId}-${idx}`}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E4ECF6",
                      borderRadius: "16px",
                      padding: "20px",
                      boxShadow: "0 6px 20px rgba(18,63,110,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px"
                    }}
                  >
                    {/* 1. TOP ROW: Drag handle, Q# Badge, Type Dropdown | Delete */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ cursor: "grab", color: "#94A3B8", display: "flex", alignItems: "center" }} title="Drag handle">
                          <GripVertical size={18} />
                        </div>

                        <div style={{
                          backgroundColor: "#EEF4FB",
                          color: "#126BFF",
                          fontWeight: "700",
                          fontSize: "13px",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          border: "1px solid #D4E4FA",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          Question {idx + 1}
                        </div>

                        <select
                          value={q.question_type}
                          onChange={(e: any) => {
                            const newQ = [...questions];
                            newQ[globalIndex].question_type = e.target.value;
                            if (e.target.value === "True / False") {
                              newQ[globalIndex].answers = [
                                { answer_text: "True", is_correct: true },
                                { answer_text: "False", is_correct: false }
                              ];
                            }
                            setQuestions(newQ);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #DCE6F3",
                            backgroundColor: "#F8FAFC",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#0B1F3A",
                            outline: "none",
                            cursor: "pointer"
                          }}
                        >
                          <option value="MCQ">Multiple Choice</option>
                          <option value="True / False">True / False</option>
                          <option value="Short Answer">Short Answer</option>
                          <option value="Fill in the Blank">Fill in the Blank</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (hasStudentAttempts && q.id) {
                            alert("This question is part of an existing student attempt and cannot be deleted.");
                            return;
                          }
                          const newQ = [...questions];
                          newQ.splice(globalIndex, 1);
                          setQuestions(newQ);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #FEE2E2",
                          backgroundColor: "#FEF2F2",
                          color: "#EF4444",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <Trash2 size={14} />
                        Delete Question
                      </button>
                    </div>

                    {/* 2. QUESTION FIELD */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3D5E8A", marginBottom: "6px" }}>
                        Question
                      </label>
                      <textarea
                        value={q.question_text}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[globalIndex].question_text = e.target.value;
                          setQuestions(newQ);
                        }}
                        placeholder="Enter the question text here..."
                        style={{
                          width: "100%",
                          minHeight: "92px",
                          padding: "14px 16px",
                          borderRadius: "10px",
                          border: "1px solid #DCE6F3",
                          fontSize: "15px",
                          color: "#0B1F3A",
                          outline: "none",
                          resize: "vertical",
                          boxSizing: "border-box",
                          fontFamily: "inherit"
                        }}
                      />
                    </div>

                    {/* 3. ANSWER OPTIONS SECTION BELOW QUESTION FIELD */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3D5E8A", marginBottom: "10px" }}>
                        Answer Options
                      </label>

                      {q.question_type === "MCQ" || q.question_type === "True / False" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {q.answers.map((a, aIdx) => {
                            const isCorrect = a.is_correct;
                            return (
                              <div
                                key={aIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "4px 8px 4px 12px",
                                  borderRadius: "10px",
                                  backgroundColor: isCorrect ? "#F3FCF7" : "#FFFFFF",
                                  border: isCorrect ? "1px solid #B7E7C9" : "1px solid #DCE6F3",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <div
                                  onClick={() => {
                                    const newQ = [...questions];
                                    newQ[globalIndex].answers.forEach((ans, i) => {
                                      ans.is_correct = i === aIdx;
                                    });
                                    setQuestions(newQ);
                                  }}
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    border: isCorrect ? "6px solid #10B981" : "2px solid #CBD5E1",
                                    backgroundColor: "#FFFFFF",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    transition: "all 0.15s ease"
                                  }}
                                  title={isCorrect ? "Correct Answer" : "Set as Correct Answer"}
                                />

                                <input
                                  value={a.answer_text}
                                  onChange={(e) => {
                                    const newQ = [...questions];
                                    newQ[globalIndex].answers[aIdx].answer_text = e.target.value;
                                    setQuestions(newQ);
                                  }}
                                  placeholder={`Option ${aIdx + 1}`}
                                  style={{
                                    flex: 1,
                                    height: "44px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    padding: "0 8px",
                                    fontSize: "14px",
                                    color: "#0B1F3A",
                                    outline: "none"
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQ = [...questions];
                                    newQ[globalIndex].answers.splice(aIdx, 1);
                                    setQuestions(newQ);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94A3B8",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "8px",
                                    borderRadius: "6px",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                                  title="Remove option"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}

                          {q.question_type === "MCQ" && (
                            <button
                              type="button"
                              onClick={() => {
                                const newQ = [...questions];
                                newQ[globalIndex].answers.push({
                                  answer_text: "",
                                  is_correct: newQ[globalIndex].answers.length === 0
                                });
                                setQuestions(newQ);
                              }}
                              style={{
                                alignSelf: "flex-start",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "8px",
                                border: "1px solid #D4E4FA",
                                backgroundColor: "#EEF4FB",
                                color: "#126BFF",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                                marginTop: "4px",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <Plus size={15} />
                              Add Option
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#3D5E8A", whiteSpace: "nowrap" }}>
                            Expected Answer:
                          </span>
                          <input
                            value={q.correct_value || ""}
                            onChange={(e) => {
                              const newQ = [...questions];
                              newQ[globalIndex].correct_value = e.target.value;
                              setQuestions(newQ);
                            }}
                            placeholder="Enter the correct answer here..."
                            style={{
                              flex: 1,
                              height: "44px",
                              borderRadius: "10px",
                              border: "1px solid #DCE6F3",
                              padding: "0 14px",
                              fontSize: "14px",
                              color: "#0B1F3A",
                              outline: "none"
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {skillQuestions.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px", color: "#94A3B8", fontSize: "13px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px dashed #E2E8F0" }}>
                  No questions added for this skill yet. Click "+ Add Question" below.
                </div>
              )}

              {/* Add Question Button placed below the last question card */}
              <div style={{ display: "flex", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => addQuestionToSkill(skId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    height: "44px",
                    padding: "0 22px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#126BFF",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(18, 107, 255, 0.2)",
                    transition: "all 0.15s ease",
                    width: isMobile ? "100%" : "auto"
                  }}
                >
                  <Plus size={16} />
                  Add Question
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px" }}>
        {/* 5. Scoring & Settings Card */}
        <Card>
          <CardTitle
            title="5. Scoring & Settings"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="#3b82f6"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Toggle checked={randomizeOrder} onChange={setRandomizeOrder} label="Randomize question order" />
            <Toggle checked={showResults} onChange={setShowResults} label="Show results immediately" />
            <Toggle checked={autoGrade} onChange={setAutoGrade} label="Auto-grade objective questions" />
            <Toggle checked={allowReview} onChange={setAllowReview} label="Allow review after submission" />
          </div>
        </Card>

        {/* Quiz Summary Card */}
        <Card>
          <CardTitle
            title="Quiz Summary"
            icon={<FileText size={16} color="#3b82f6" />}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", height: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{selectedSkillIds.length}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Selected Skills</div>
            </div>
            <div style={{ width: "1px", height: "40px", backgroundColor: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{questions.length}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Total Questions</div>
            </div>
            <div style={{ width: "1px", height: "40px", backgroundColor: "#e2e8f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>{estimatedTime || "0"} min</div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <button
          type="button"
          onClick={() => navigate("/teacher/quizzes")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid #DCE6F3",
            backgroundColor: "#FFFFFF",
            color: "#3D5E8A",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading || savingDraft}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "1px solid #126BFF",
              backgroundColor: "#FFFFFF",
              color: "#126BFF",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading || savingDraft ? "not-allowed" : "pointer"
            }}
          >
            {savingDraft ? "Saving Draft..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || savingDraft || !canSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: canSave ? "#126BFF" : "#94A3B8",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: "600",
              cursor: canSave && !loading && !savingDraft ? "pointer" : "not-allowed"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            {loading ? "Publishing..." : statusVal === "DRAFT" ? "Publish Quiz" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 31, 58, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(11, 31, 58, 0.2)",
            width: "100%",
            maxWidth: "440px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#FFE5E8",
                color: "#FF3347",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>Delete Quiz</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5D78A3" }}>This action cannot be undone.</p>
              </div>
            </div>

            <p style={{ fontSize: "14px", color: "#334155", margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{title || "this quiz"}"</strong>? All associated questions and attempt records will be permanently removed.
            </p>

            {deleteError && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#FFF5F5", border: "1px solid #FFB8BE", color: "#FF3347", fontSize: "13px" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                disabled={deleting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#FFFFFF",
                  color: "#3D5E8A",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteQuiz}
                disabled={deleting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#FF3347",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {deleting ? "Deleting..." : "Delete Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Class Modal */}
      {showAddClassModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 31, 58, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(11, 31, 58, 0.2)",
            width: "100%",
            maxWidth: "400px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>Add New Class</h3>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>Class Name</label>
              <input
                type="text"
                placeholder="e.g. Grade 10-A, Class 11-B"
                value={newClassName}
                onChange={(e) => { setNewClassName(e.target.value); setModalClassError(""); }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "13px", outline: "none" }}
                autoFocus
              />
              {modalClassError && (
                <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px", fontWeight: "500" }}>
                  {modalClassError}
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => { setShowAddClassModal(false); setNewClassName(""); }}
                disabled={addingClass}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#FFFFFF",
                  color: "#3D5E8A",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddClassFromModal}
                disabled={addingClass || !newClassName.trim()}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#126BFF",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: newClassName.trim() ? "pointer" : "not-allowed"
                }}
              >
                {addingClass ? "Adding..." : "Add Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditQuiz;
