import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { 
  FileText, 
  Plus, 
  BookOpen, 
  Trash2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  X, 
  Filter, 
  Sparkles,
  HelpCircle
} from "lucide-react";

// Reusable Components
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import { sortQuizzesByProgression } from "../../utils/quizOrdering";
import { queryClient } from "../../api/queryClient";
import { CardSkeleton } from "../../components/common/Skeletons";

const getLevelName = (quiz: any): string | null => {
  const name = quiz.quiz_level_name || quiz.quiz_level_details?.name || quiz.learning_level || (typeof quiz.quiz_level === "object" ? quiz.quiz_level?.name : "") || (typeof quiz.quiz_level === "string" ? quiz.quiz_level : "");
  return name ? name : null;
};

const getDifficultyName = (quiz: any): string | null => {
  const name = quiz.difficulty_name || quiz.difficulty_details?.name || (typeof quiz.difficulty === "object" ? quiz.difficulty?.name : "") || (typeof quiz.difficulty === "string" ? quiz.difficulty : "");
  return name ? name : null;
};

const getLevelBadgeStyle = (levelName: string) => {
  const lower = (levelName || "").toLowerCase();
  if (lower.includes("advanced") || lower.includes("hard")) {
    return { backgroundColor: "#E0E7FF", color: "#3730A3", border: "1px solid #C7D2FE" };
  }
  if (lower.includes("intermediate") || lower.includes("medium")) {
    return { backgroundColor: "#F1EDFF", color: "#6C4BFF", border: "1px solid #D8CFFF" };
  }
  return { backgroundColor: "#EAF3FF", color: "#126BFF", border: "1px solid #B8D5FF" };
};

const getDifficultyBadgeStyle = (diffName: string) => {
  const lower = (diffName || "").toLowerCase();
  if (lower.includes("hard") || lower.includes("high") || lower.includes("advanced")) {
    return { backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  }
  if (lower.includes("medium") || lower.includes("intermediate")) {
    return { backgroundColor: "#FFF7ED", color: "#D97706", border: "1px solid #FDE68A" };
  }
  return { backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" };
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

type QuizItem = {
  id: number;
  title: string;
  description: string;
  lesson: number;
  lesson_title: string;
  skill?: number;
  learning_level?: string;
  quiz_level?: number;
  quiz_level_name?: string;
  difficulty?: number;
  difficulty_name?: string;
  order?: number;
  questions: any[];
  created_at: string;
  status?: string;
  assigned_class_name?: string;
};

type LessonItem = {
  id: number;
  title: string;
  description: string;
  term?: number;
  grade?: string;
  order?: number;
};

type SkillItem = {
  id: number;
  name: string;
  lesson?: number;
};

type MetadataItem = {
  id: number;
  name: string;
  order?: number;
};

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [quizLevels, setQuizLevels] = useState<MetadataItem[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<MetadataItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtering states
  const [search, setSearch] = useState("");
  const [filterLesson, setFilterLesson] = useState("ALL");
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState("ALL");
  
  // Collapse state for lesson groups
  const [collapsedLessons, setCollapsedLessons] = useState<Record<number, boolean>>({});

  const [hoverCreate, setHoverCreate] = useState(false);

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Token ${token}` };
      const [quizzesData, lessonsData, skillsData, levelsData, diffData] = await Promise.all([
        queryClient.fetchQuery(["teacher", "quizzes"], async () => {
          const res = await fetch("/api/quizzes/", { headers });
          return res.ok ? await res.json() : [];
        }, { staleTime: 120000 }),
        queryClient.fetchQuery(["teacher", "lessons"], async () => {
          const res = await fetch("/api/quizzes/lessons/", { headers });
          return res.ok ? await res.json() : [];
        }, { staleTime: 600000 }),
        queryClient.fetchQuery(["teacher", "skills"], async () => {
          const res = await fetch("/api/quizzes/skills/", { headers });
          return res.ok ? await res.json() : [];
        }, { staleTime: 600000 }),
        queryClient.fetchQuery(["teacher", "quiz-levels"], async () => {
          const res = await fetch("/api/quizzes/quiz-levels/", { headers });
          return res.ok ? await res.json() : [];
        }, { staleTime: 600000 }),
        queryClient.fetchQuery(["teacher", "difficulty-levels"], async () => {
          const res = await fetch("/api/quizzes/difficulty-levels/", { headers });
          return res.ok ? await res.json() : [];
        }, { staleTime: 600000 }),
      ]);

      const qList = Array.isArray(quizzesData) ? quizzesData : (quizzesData as any).results || [];
      setQuizzes(qList);

      const lessonList = Array.isArray(lessonsData) ? lessonsData : (lessonsData as any).results || [];
      lessonList.sort((a: any, b: any) => (a.order ?? a.id) - (b.order ?? b.id));
      setLessons(lessonList);

      setSkills(Array.isArray(skillsData) ? skillsData : (skillsData as any).results || []);
      setQuizLevels(Array.isArray(levelsData) ? levelsData : (levelsData as any).results || []);
      setDifficultyLevels(Array.isArray(diffData) ? diffData : (diffData as any).results || []);
    } catch (err) {
      console.error("Error fetching quizzes data:", err);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyStatus = (quiz: QuizItem) => {
    const levelName = quiz.difficulty_name || quiz.quiz_level_name || quiz.learning_level || "";
    if (!levelName) return "Medium";
    const lower = levelName.toLowerCase();
    if (lower.includes("beginner") || lower.includes("easy") || lower.includes("low")) return "Low";
    if (lower.includes("advanced") || lower.includes("hard") || lower.includes("high")) return "High";
    return "Medium";
  };

  const isFilteringActive = Boolean(
    search.trim() !== "" ||
    filterLesson !== "ALL" ||
    filterSkill !== "ALL" ||
    filterLevel !== "ALL" ||
    filterDifficulty !== "ALL"
  );

  const handleLessonFilterChange = (newLessonId: string) => {
    setFilterLesson(newLessonId);
    if (filterSkill !== "ALL") {
      const relevantQuizzes = newLessonId === "ALL" 
        ? quizzes 
        : quizzes.filter(q => String(q.lesson) === String(newLessonId));
      const validSkillIds = new Set(relevantQuizzes.map(q => q.skill ? String(q.skill) : null).filter(Boolean));
      if (!validSkillIds.has(String(filterSkill))) {
        setFilterSkill("ALL");
      }
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterLesson("ALL");
    setFilterSkill("ALL");
    setFilterLevel("ALL");
    setFilterDifficulty("ALL");
  };

  // Lesson dropdown options: derived strictly from quizzes currently in the dataset
  const availableLessonOptions = useMemo(() => {
    const lessonMap = new Map<string, LessonItem>();
    
    // First map from fetched lessons
    lessons.forEach(l => {
      lessonMap.set(String(l.id), l);
    });

    // Add any lesson present on quizzes that might be missing from lessons list
    quizzes.forEach(q => {
      if (q.lesson && !lessonMap.has(String(q.lesson))) {
        lessonMap.set(String(q.lesson), {
          id: Number(q.lesson) || (q.lesson as any),
          title: q.lesson_title || `Lesson #${q.lesson}`,
          description: "",
          order: 9999
        });
      }
    });

    const lessonIdsWithQuizzes = new Set(
      quizzes.map(q => q.lesson ? String(q.lesson) : null).filter(Boolean)
    );

    const options = Array.from(lessonMap.values()).filter(l => lessonIdsWithQuizzes.has(String(l.id)));
    return options.sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
  }, [lessons, quizzes]);

  // Skill dropdown options: derived strictly from quizzes (and narrowed by selected lesson)
  const availableSkillOptions = useMemo(() => {
    const relevantQuizzes = filterLesson === "ALL"
      ? quizzes
      : quizzes.filter(q => String(q.lesson) === String(filterLesson));
    const skillIdsWithQuizzes = new Set(relevantQuizzes.map(q => q.skill ? String(q.skill) : null).filter(Boolean));
    return skills.filter(s => skillIdsWithQuizzes.has(String(s.id)));
  }, [skills, quizzes, filterLesson]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = quiz.title?.toLowerCase().includes(q);
        const lessonMatch = quiz.lesson_title?.toLowerCase().includes(q);
        const skillObj = skills.find(s => String(s.id) === String(quiz.skill));
        const skillMatch = skillObj?.name?.toLowerCase().includes(q);
        if (!titleMatch && !lessonMatch && !skillMatch) return false;
      }

      // 2. Lesson Filter
      if (filterLesson !== "ALL") {
        if (String(quiz.lesson) !== String(filterLesson)) return false;
      }

      // 3. Skill Filter
      if (filterSkill !== "ALL") {
        if (String(quiz.skill) !== String(filterSkill)) return false;
      }

      // 4. Level Filter
      if (filterLevel !== "ALL") {
        const matchesLevel =
          String(quiz.quiz_level) === String(filterLevel) ||
          quiz.quiz_level_name === filterLevel ||
          quiz.learning_level === filterLevel;
        if (!matchesLevel) return false;
      }

      // 5. Difficulty Filter
      if (filterDifficulty !== "ALL") {
        const matchesDiff =
          String(quiz.difficulty) === String(filterDifficulty) ||
          quiz.difficulty_name === filterDifficulty;
        if (!matchesDiff) return false;
      }

      return true;
    });
  }, [quizzes, search, filterLesson, filterSkill, filterLevel, filterDifficulty, skills]);

  const groupedLessonSections = useMemo(() => {
    const lessonMap = new Map<string, LessonItem>();
    
    // First map from fetched lessons
    lessons.forEach(l => {
      lessonMap.set(String(l.id), l);
    });

    // Synthesize lesson records for any quiz whose lesson ID is not in lessons array
    quizzes.forEach(q => {
      if (q.lesson && !lessonMap.has(String(q.lesson))) {
        lessonMap.set(String(q.lesson), {
          id: Number(q.lesson) || (q.lesson as any),
          title: q.lesson_title || `Lesson #${q.lesson}`,
          description: "",
          order: 9999
        });
      }
    });

    const sortedLessons = Array.from(lessonMap.values()).sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));

    // Map lessons into sections with sorted quizzes
    const sections = sortedLessons.map(lesson => {
      const lessonQuizzes = sortQuizzesByProgression(
        filteredQuizzes.filter(q => q.lesson && String(q.lesson) === String(lesson.id))
      );

      return {
        lesson,
        quizzes: lessonQuizzes,
      };
    });

    // Unassigned quizzes (quizzes with no lesson ID)
    const unassigned = sortQuizzesByProgression(
      filteredQuizzes.filter(q => !q.lesson)
    );

    if (unassigned.length > 0) {
      sections.push({
        lesson: {
          id: 0,
          title: "Unassigned Quizzes",
          description: "Quizzes not explicitly assigned to a syllabus lesson.",
          order: 99999
        },
        quizzes: unassigned
      });
    }

    // Always filter out empty lesson sections completely (show only lessons with quizzes)
    return sections.filter(sec => sec.quizzes.length > 0);
  }, [lessons, quizzes, filteredQuizzes]);

  const toggleLessonCollapse = (lessonId: number) => {
    setCollapsedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>
        <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Loading quizzes...</div>
        <div style={{ fontSize: "14px", color: "#8CA3C7" }}>Organizing quiz groups by lesson</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Page Header */}
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
            width: "48px",
            height: "48px",
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
              Quizzes
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3", fontWeight: "400" }}>
              Manage and review all your quizzes.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto" }}>
          <button 
            onClick={() => navigate("/teacher/quizzes/create")}
            onMouseEnter={() => setHoverCreate(true)}
            onMouseLeave={() => setHoverCreate(false)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px", 
              height: "42px", 
              padding: "0 20px", 
              borderRadius: "9px", 
              border: "none", 
              background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", 
              color: "white", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
              transform: hoverCreate ? "translateY(-1px)" : "none",
              filter: hoverCreate ? "brightness(0.95)" : "none",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Quiz
          </button>
        </div>
      </div>

      {/* Expanded Filter Toolbar */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile 
            ? "1fr" 
            : isTablet 
              ? "repeat(2, 1fr)" 
              : "minmax(240px, 2fr) repeat(4, minmax(150px, 1fr))",
          gap: "12px",
          alignItems: "center"
        }}>
          {/* Search Box */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={16} color="#8CA3C7" style={{ position: "absolute", left: "14px", pointerEvents: "none" }} />
            <input 
              type="text"
              placeholder="Search quizzes by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 36px 0 38px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#F7FAFE",
                fontSize: "13.5px",
                color: "#0B1F3A",
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.2s"
              }}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "12px", background: "none", border: "none", color: "#8CA3C7", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lesson Filter */}
          <div>
            <select
              value={filterLesson}
              onChange={e => handleLessonFilterChange(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 12px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: filterLesson !== "ALL" ? "#EAF3FF" : "#F7FAFE",
                color: filterLesson !== "ALL" ? "#126BFF" : "#0B1F3A",
                fontSize: "13.5px",
                fontWeight: filterLesson !== "ALL" ? "600" : "500",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="ALL">All Lessons</option>
              {availableLessonOptions.map(l => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div>
            <select
              value={filterSkill}
              onChange={e => setFilterSkill(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 12px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: filterSkill !== "ALL" ? "#EAF3FF" : "#F7FAFE",
                color: filterSkill !== "ALL" ? "#126BFF" : "#0B1F3A",
                fontSize: "13.5px",
                fontWeight: filterSkill !== "ALL" ? "600" : "500",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="ALL">All Skills</option>
              {availableSkillOptions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 12px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: filterLevel !== "ALL" ? "#EAF3FF" : "#F7FAFE",
                color: filterLevel !== "ALL" ? "#126BFF" : "#0B1F3A",
                fontSize: "13.5px",
                fontWeight: filterLevel !== "ALL" ? "600" : "500",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="ALL">All Levels</option>
              {quizLevels.length > 0 ? (
                quizLevels.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                ))
              ) : (
                <>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </>
              )}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 12px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: filterDifficulty !== "ALL" ? "#EAF3FF" : "#F7FAFE",
                color: filterDifficulty !== "ALL" ? "#126BFF" : "#0B1F3A",
                fontSize: "13.5px",
                fontWeight: filterDifficulty !== "ALL" ? "600" : "500",
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="ALL">All Difficulties</option>
              {difficultyLevels.length > 0 ? (
                difficultyLevels.map(diff => (
                  <option key={diff.id} value={diff.id}>{diff.name}</option>
                ))
              ) : (
                <>
                  <option value="Low">Low / Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High / Hard</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Clear Filters Toolbar Action */}
        {isFilteringActive && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #E4ECF6" }}>
            <span style={{ fontSize: "13px", color: "#5D78A3", fontWeight: "500" }}>
              Showing filtered quiz results
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                height: "34px",
                padding: "0 14px",
                borderRadius: "7px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#FFFFFF",
                color: "#3D5E8A",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Quizzes List Content */}
      {quizzes.length === 0 ? (
        /* Global Empty State: No Quizzes in Account */
        <EmptyState 
          title="No quizzes created yet." 
          description="Create your first quiz to start assessing student learning." 
          icon={<FileText size={32} />}
          actionLabel="Create Quiz"
          onAction={() => navigate("/teacher/quizzes/create")}
        />
      ) : groupedLessonSections.length === 0 ? (
        /* Filter Empty State: No Matching Quizzes */
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E4ECF6",
          padding: "48px 20px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px"
        }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "#F1EDFF", color: "#6C4BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Filter size={26} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
              No quizzes match the selected filters.
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#5D78A3" }}>
              Try adjusting your search query or filter options.
            </p>
          </div>
          {isFilteringActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                height: "40px",
                padding: "0 20px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#FFFFFF",
                color: "#126BFF",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "6px"
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* Grouped Quizzes by Lesson */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {groupedLessonSections.map(({ lesson, quizzes: lessonQuizzes }) => {
            const isCollapsed = Boolean(collapsedLessons[lesson.id]);
            const quizCountText = `${lessonQuizzes.length} ${lessonQuizzes.length === 1 ? "Quiz" : "Quizzes"}`;

            return (
              <div 
                key={lesson.id} 
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E4ECF6",
                  borderRadius: "16px",
                  boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
                  overflow: "hidden"
                }}
              >
                {/* Lesson Header */}
                <div 
                  onClick={() => toggleLessonCollapse(lesson.id)}
                  style={{
                    padding: "20px 24px",
                    backgroundColor: "#FFFFFF",
                    borderBottom: !isCollapsed ? "1px solid #E4ECF6" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    gap: "16px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      backgroundColor: "#EAF3FF",
                      color: "#126BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <BookOpen size={22} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0B1F3A" }}>
                          {lesson.title}
                        </h3>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          backgroundColor: "#EAF3FF",
                          color: "#126BFF",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {quizCountText}
                        </span>
                      </div>

                      {lesson.grade && (
                        <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "3px" }}>
                          {lesson.grade}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={isCollapsed ? "Expand lesson quizzes" : "Collapse lesson quizzes"}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#5D78A3",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px",
                      borderRadius: "6px"
                    }}
                  >
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </button>
                </div>

                {/* Lesson Quizzes List (if expanded) */}
                {!isCollapsed && (
                  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#FAFBFD" }}>
                    {lessonQuizzes.length === 0 ? (
                      /* Empty Lesson Group */
                      <div style={{
                        padding: "24px",
                        textAlign: "center",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px dashed #DCE6F3",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px"
                      }}>
                        <span style={{ fontSize: "14px", color: "#5D78A3" }}>
                          No quizzes created for this lesson yet.
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/teacher/quizzes/create${lesson.id ? `?lessonId=${lesson.id}` : ''}`)}
                          style={{
                            height: "34px",
                            padding: "0 14px",
                            borderRadius: "7px",
                            border: "1px solid #126BFF",
                            backgroundColor: "#EEF4FB",
                            color: "#126BFF",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Plus size={14} /> Create Quiz
                        </button>
                      </div>
                    ) : (
                      lessonQuizzes.map((quiz) => {
                        const skillObj = skills.find(s => s.id === quiz.skill);
                        const skillName = skillObj ? skillObj.name : null;

                        return (
                          <div 
                            key={quiz.id} 
                            style={{
                              display: "flex",
                              flexDirection: isMobile ? "column" : "row",
                              alignItems: isMobile ? "flex-start" : "center",
                              justifyContent: "space-between",
                              padding: "18px 20px",
                              backgroundColor: "#FFFFFF",
                              borderRadius: "12px",
                              border: "1px solid #E4ECF6",
                              gap: isMobile ? "16px" : "12px",
                              boxShadow: "0 2px 8px rgba(18,63,110,0.02)"
                            }}
                          >
                            {/* Quiz Info */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flex: 1 }}>
                              <div style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                backgroundColor: "#F1EDFF",
                                color: "#6C4BFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                <FileText size={20} />
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div>
                                  <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#0B1F3A", margin: "0 0 4px 0" }}>
                                    {quiz.title}
                                  </h4>
                                  
                                  <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "13px", color: "#5D78A3", flexWrap: "wrap" }}>
                                    {skillName && (
                                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#126BFF", fontWeight: "500" }}>
                                        Skill: {skillName}
                                      </span>
                                    )}
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                      <HelpCircle size={13} />
                                      {quiz.questions?.length || 0} Questions
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                  {quiz.assigned_class_name && (
                                    <span style={{ padding: "3px 8px", borderRadius: "5px", backgroundColor: "#F1F5F9", color: "#475569", fontSize: "12px", fontWeight: "500" }}>
                                      {quiz.assigned_class_name}
                                    </span>
                                  )}
                                  {getLevelName(quiz) && (
                                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", ...getLevelBadgeStyle(getLevelName(quiz)!) }}>
                                      {getLevelName(quiz)}
                                    </span>
                                  )}
                                  {getDifficultyName(quiz) && (
                                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", ...getDifficultyBadgeStyle(getDifficultyName(quiz)!) }}>
                                      {getDifficultyName(quiz)}
                                    </span>
                                  )}
                                  {quiz.status === "DRAFT" && (
                                    <span style={{
                                      padding: "3px 10px",
                                      borderRadius: "12px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      backgroundColor: "#FFFBEB",
                                      color: "#D97706",
                                      border: "1px solid #FDE68A"
                                    }}>
                                      Draft
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quiz Actions */}
                            <div style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                              width: isMobile ? "100%" : "auto",
                              flexWrap: isMobile ? "wrap" : "nowrap"
                            }}>
                              <button 
                                type="button"
                                onClick={() => navigate(`/teacher/materials?quiz=${quiz.id}`)}
                                style={{
                                  height: "38px",
                                  padding: "0 14px",
                                  borderRadius: "8px",
                                  border: "1px solid #126BFF",
                                  backgroundColor: "#EEF4FB",
                                  color: "#126BFF",
                                  fontSize: "13.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  flex: isMobile ? "1 1 calc(50% - 4px)" : "initial"
                                }}
                              >
                                <BookOpen size={15} />
                                Materials
                              </button>
                              
                              <button 
                                type="button"
                                onClick={() => navigate(`/teacher/quizzes/${quiz.id}/edit`)}
                                style={{
                                  height: "38px",
                                  padding: "0 14px",
                                  borderRadius: "8px",
                                  border: "1px solid #DCE6F3",
                                  backgroundColor: "#FFFFFF",
                                  color: "#0B1F3A",
                                  fontSize: "13.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flex: isMobile ? "1 1 calc(50% - 4px)" : "initial"
                                }}
                              >
                                Edit Quiz
                              </button>
                              
                              <button 
                                type="button"
                                onClick={() => navigate(`/teacher/quizzes/${quiz.id}/results`)}
                                style={{
                                  height: "38px",
                                  padding: "0 14px",
                                  borderRadius: "8px",
                                  border: "none",
                                  backgroundColor: "rgba(108, 75, 255, 0.10)",
                                  color: "#6C4BFF",
                                  fontSize: "13.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flex: isMobile ? "1 1 calc(50% - 4px)" : "initial"
                                }}
                              >
                                View Results
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
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

export default QuizList;
