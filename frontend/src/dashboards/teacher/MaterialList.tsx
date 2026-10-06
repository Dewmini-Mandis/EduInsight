import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

import {
  FileText,
  Plus,
  Search,
  X,
  BookOpen,
  Target,
  Video,
  Paperclip,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Settings,
  Eye,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import MaterialRow from "./materials/MaterialRow";

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

type MaterialItem = {
  id: number;
  title: string;
  material_type: "VIDEO" | "PDF" | "TEXT";
  lesson?: number;
  lesson_title?: string;
  skill?: number;
  skill_name?: string;
  order?: number;
  created_at: string;
};

type MaterialGroup = {
  key: string;
  lessonId: string;
  lessonTitle: string;
  skillId: string;
  skillName: string;
  materials: MaterialItem[];
  materialCount: number;
  types: string[];
};

const MaterialList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryLessonId = searchParams.get("lessonId") || "";
  const querySkillId = searchParams.get("skillId") || "";
  const queryQuizId = searchParams.get("quiz") || searchParams.get("quizId") || "";

  // View Mode: "list" (grouped records), "workspace" (editing Lesson+Skill), or "quiz" (quiz materials)
  const [viewMode, setViewMode] = useState<"list" | "workspace" | "quiz">(
    queryQuizId ? "quiz" : queryLessonId && querySkillId ? "workspace" : "list"
  );

  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [workspaceMaterials, setWorkspaceMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All Types");

  const [lessonsList, setLessonsList] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  const [selectedLessonId, setSelectedLessonId] = useState(queryLessonId);
  const [selectedSkillId, setSelectedSkillId] = useState(querySkillId);

  // Quiz-specific state
  const [quizData, setQuizData] = useState<any | null>(null);
  const [quizSkills, setQuizSkills] = useState<any[]>([]);
  const [quizMaterials, setQuizMaterials] = useState<MaterialItem[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");

  // Quiz Add Material Modal State
  const [showQuizAddModal, setShowQuizAddModal] = useState<boolean>(false);
  const [selectedQuizSkillForAdd, setSelectedQuizSkillForAdd] = useState<string>("");

  // Material Type Selection Modal State
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [hoverAddMaterial, setHoverAddMaterial] = useState(false);

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Auto-dismiss toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch initial lessons
  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch("/api/quizzes/lessons/", {
        headers: { Authorization: `Token ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setLessonsList(list);
      }
    } catch (e) {
      console.error("Error fetching lessons:", e);
    }
  };

  // Fetch skills whenever selectedLessonId changes
  useEffect(() => {
    if (!selectedLessonId) {
      setSkillsList([]);
      setSelectedSkillId("");
      return;
    }

    fetch(`/api/quizzes/skills/?lesson=${selectedLessonId}&active_only=true`, {
      headers: { Authorization: `Token ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setSkillsList(list);

        // Validation: If previously selected Skill does not belong to new Lesson, reset Skill
        if (selectedSkillId) {
          const exists = list.some((s: any) => String(s.id) === String(selectedSkillId));
          if (!exists) {
            setSelectedSkillId(list.length > 0 ? String(list[0].id) : "");
          }
        }
      })
      .catch((e) => console.error("Error fetching skills:", e));
  }, [selectedLessonId]);

  // Fetch Quiz & its associated materials for Quiz Materials view
  const fetchQuizAndMaterials = async (quizId: string) => {
    setLoadingQuiz(true);
    setQuizError("");
    const token = getToken();
    try {
      const [quizRes, materialsRes, skillsRes] = await Promise.all([
        fetch(`/api/quizzes/${quizId}/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/materials/?quiz=${quizId}`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/skills/`, { headers: { Authorization: `Token ${token}` } }),
      ]);

      if (!quizRes.ok) {
        setQuizError("Unable to load quiz materials.");
        setLoadingQuiz(false);
        return;
      }

      const qData = await quizRes.json();
      setQuizData(qData);

      let mDataList: MaterialItem[] = [];
      if (materialsRes.ok) {
        const mJson = await materialsRes.json();
        mDataList = Array.isArray(mJson) ? mJson : (mJson.results || []);
      }
      setQuizMaterials(mDataList);

      let allSkills: any[] = [];
      if (skillsRes.ok) {
        const sJson = await skillsRes.json();
        allSkills = Array.isArray(sJson) ? sJson : (sJson.results || []);
      }

      // Determine the skills belonging to this quiz
      let derivedSkills: any[] = [];
      if (qData.covered_skills_details && qData.covered_skills_details.length > 0) {
        derivedSkills = qData.covered_skills_details;
      } else if (qData.skill_ids && qData.skill_ids.length > 0) {
        const idSet = new Set(qData.skill_ids);
        derivedSkills = allSkills.filter(s => idSet.has(s.id));
      } else if (qData.skill) {
        const match = allSkills.find(s => s.id === qData.skill);
        if (match) {
          derivedSkills = [match];
        } else {
          derivedSkills = [{ id: qData.skill, name: `Skill #${qData.skill}` }];
        }
      } else if (qData.questions && qData.questions.length > 0) {
        const qSkillIds = new Set(qData.questions.map((q: any) => q.skill).filter(Boolean));
        derivedSkills = allSkills.filter(s => qSkillIds.has(s.id));
      }

      setQuizSkills(derivedSkills);
    } catch (err) {
      console.error("Error fetching quiz materials:", err);
      setQuizError("Unable to load quiz materials.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    if (queryQuizId) {
      setViewMode("quiz");
      fetchQuizAndMaterials(queryQuizId);
    }
  }, [queryQuizId]);

  // Compute quiz skills & material coverage using exact entity IDs
  const quizSkillIdsSet = useMemo(() => new Set(quizSkills.map(s => s.id)), [quizSkills]);

  const filteredQuizMaterials = useMemo(() => {
    return quizMaterials.filter(m => m.skill && quizSkillIdsSet.has(m.skill));
  }, [quizMaterials, quizSkillIdsSet]);

  // Quiz skills that currently have 0 materials
  const missingQuizSkills = useMemo(() => {
    return quizSkills.filter(skill => 
      !filteredQuizMaterials.some(m => Number(m.skill) === Number(skill.id))
    );
  }, [quizSkills, filteredQuizMaterials]);

  const hasMissingSkillMaterials = missingQuizSkills.length > 0;

  // Fetch all materials for main grouped view
  const fetchAllMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes/materials/", {
        headers: { Authorization: `Token ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllMaterials(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error("Error fetching all materials:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workspace materials for current selected Lesson + Skill
  const fetchWorkspaceMaterials = async () => {
    if (!selectedLessonId || !selectedSkillId) {
      setWorkspaceMaterials([]);
      return;
    }
    setLoading(true);
    try {
      const url = `/api/quizzes/materials/?lesson=${selectedLessonId}&skill=${selectedSkillId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Token ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMaterials(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error("Error fetching workspace materials:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "list") {
      fetchAllMaterials();
    } else if (viewMode === "workspace") {
      if (selectedLessonId && selectedSkillId) {
        fetchWorkspaceMaterials();
      } else {
        setWorkspaceMaterials([]);
      }
    }
  }, [viewMode, selectedLessonId, selectedSkillId]);

  // Handle lesson dropdown change
  const handleLessonChange = (newLessonId: string) => {
    setSelectedLessonId(newLessonId);
    setSelectedSkillId("");
  };

  const handleDeleteMaterial = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/materials/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          if (viewMode === "workspace") {
            fetchWorkspaceMaterials();
          } else {
            fetchAllMaterials();
          }
        } else {
          alert("Failed to delete material.");
        }
      } catch (e) {
        alert("Error deleting material.");
      }
    }
  };

  const handleReorder = async (newOrderedMaterials: MaterialItem[]) => {
    setWorkspaceMaterials(newOrderedMaterials);
    if (!selectedLessonId || !selectedSkillId) return;

    try {
      const orderedIds = newOrderedMaterials.map((m) => m.id);
      const res = await fetch("/api/quizzes/materials/reorder/", {
        method: "POST",
        headers: {
          Authorization: `Token ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson: selectedLessonId,
          skill: selectedSkillId,
          ordered_ids: orderedIds,
        }),
      });

      if (!res.ok) {
        console.error("Failed to persist reorder");
        fetchWorkspaceMaterials();
      }
    } catch (e) {
      console.error("Error saving reorder:", e);
      fetchWorkspaceMaterials();
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= workspaceMaterials.length) return;

    const newArr = [...workspaceMaterials];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    handleReorder(newArr);
  };

  // Group allMaterials by Lesson + Skill
  const groupedMaterials: MaterialGroup[] = (() => {
    const map = new Map<string, MaterialGroup>();

    allMaterials.forEach((mat) => {
      const lId = mat.lesson ? String(mat.lesson) : "0";
      const sId = mat.skill ? String(mat.skill) : "0";
      const key = `${lId}_${sId}`;

      const lTitle = mat.lesson_title || (mat.lesson ? `Lesson #${mat.lesson}` : "General Lesson");
      const sName = mat.skill_name || (mat.skill ? `Skill #${mat.skill}` : "General Skill");

      if (!map.has(key)) {
        map.set(key, {
          key,
          lessonId: lId,
          lessonTitle: lTitle,
          skillId: sId,
          skillName: sName,
          materials: [],
          materialCount: 0,
          types: [],
        });
      }

      const group = map.get(key)!;
      group.materials.push(mat);
      group.materialCount += 1;
      if (!group.types.includes(mat.material_type)) {
        group.types.push(mat.material_type);
      }
    });

    return Array.from(map.values());
  })();

  // Filter grouped records for Main List
  const filteredGroups = groupedMaterials.filter((group) => {
    const searchMatch =
      group.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.skillName.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch =
      filterType === "All Types"
        ? true
        : group.types.includes(filterType.toUpperCase());
    return searchMatch && typeMatch;
  });

  // Filter materials inside workspace view
  const filteredWorkspaceMaterials = workspaceMaterials.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      filterType === "All Types" ? true : m.material_type === filterType.toUpperCase();
    return matchSearch && matchType;
  });

  const isSelectionComplete = Boolean(selectedLessonId && selectedSkillId);

  const selectedLessonObj = lessonsList.find((l) => String(l.id) === String(selectedLessonId));
  const selectedSkillObj = skillsList.find((s) => String(s.id) === String(selectedSkillId));

  const openWorkspaceForGroup = (lId: string, sId: string) => {
    setSelectedLessonId(lId);
    setSelectedSkillId(sId);
    setSearchParams({ lessonId: lId, skillId: sId });
    setViewMode("workspace");
  };

  const returnToMainList = () => {
    setSearchParams({});
    setViewMode("list");
  };

  const handleDeleteQuizMaterial = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/materials/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          setToastMessage("Material deleted successfully.");
          if (queryQuizId) {
            fetchQuizAndMaterials(queryQuizId);
          }
        } else {
          alert("Failed to delete material.");
        }
      } catch (e) {
        alert("Error deleting material.");
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: "1240px",
        margin: "0 auto",
        padding: "24px 32px 100px 32px",
        gap: "24px",
      }}
    >
      {/* ================================================== */}
      {/* QUIZ MATERIALS VIEW (FILTERED BY QUIZ SKILLS ONLY) */}
      {/* ================================================== */}
      {viewMode === "quiz" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Toast Notification */}
          {toastMessage && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "10px",
                backgroundColor: "#E6F4EA",
                border: "1px solid #B7E1CD",
                color: "#137333",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage("")}
                style={{ background: "none", border: "none", color: "#137333", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Header Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                onClick={() => navigate("/teacher/quizzes")}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  color: "#5D78A3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Return to Quizzes List"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: isMobile ? "22px" : "26px", fontWeight: "700", color: "#0B1F3A" }}>
                  Quiz Materials: {quizData?.title || "Quiz Materials"}
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
                  {quizData?.lesson_title ? `Lesson: ${quizData.lesson_title} • ` : ""}
                  Showing materials for skills assigned to this quiz.
                </p>
              </div>
            </div>

            {/* "Add Materials" button: SHOWN ONLY WHEN AT LEAST ONE SKILL HAS ZERO MATERIALS */}
            {quizSkills.length > 0 && hasMissingSkillMaterials && (
              <button
                type="button"
                onClick={() => {
                  const firstMissing = missingQuizSkills[0];
                  setSelectedQuizSkillForAdd(firstMissing?.id ? String(firstMissing.id) : "");
                  setShowQuizAddModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  height: "44px",
                  padding: "0 22px",
                  borderRadius: "99px",
                  border: "none",
                  background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
                  whiteSpace: "nowrap",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                Add Materials
              </button>
            )}
          </div>

          {/* Main Quiz Skills & Materials Body */}
          {loadingQuiz ? (
            <div style={{ textAlign: "center", padding: "50px", color: "#5D78A3", backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6" }}>
              <div style={{ fontSize: "15px", fontWeight: "600" }}>Loading quiz materials...</div>
            </div>
          ) : quizError ? (
            <div style={{ padding: "24px", borderRadius: "16px", backgroundColor: "#FFF5F5", border: "1px solid #FFB8BE", color: "#FF3347", textAlign: "center", fontWeight: "600" }}>
              {quizError}
            </div>
          ) : quizSkills.length === 0 ? (
            /* Safe Edge Case: No skills assigned to quiz */
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                backgroundColor: "#FFFFFF",
                borderRadius: "16px",
                border: "1px solid #E4ECF6",
                color: "#5D78A3",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Target size={36} color="#94A3B8" />
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0B1F3A" }}>
                No skills are assigned to this quiz.
              </h4>
              <p style={{ margin: 0, fontSize: "14px", maxWidth: "420px" }}>
                Assign skills to this quiz in the Quizzes module to view and manage skill-specific learning materials.
              </p>
            </div>
          ) : (
            /* Render Grouped Quiz Skills */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {quizSkills.map((skill) => {
                const sMaterials = filteredQuizMaterials.filter((m) => Number(m.skill) === Number(skill.id));
                const hasMaterials = sMaterials.length > 0;

                return (
                  <div
                    key={skill.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E4ECF6",
                      borderRadius: "16px",
                      boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Skill Header */}
                    <div
                      style={{
                        padding: "18px 24px",
                        backgroundColor: "#FFFFFF",
                        borderBottom: "1px solid #E4ECF6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            backgroundColor: "#EAF3FF",
                            color: "#126BFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Target size={20} />
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#5D78A3", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                            Skill
                          </span>
                          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0B1F3A" }}>
                            {skill.name}
                          </h3>
                        </div>
                      </div>

                      {/* Material Count Badge */}
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          backgroundColor: hasMaterials ? "#EAF3FF" : "#FFF5F5",
                          color: hasMaterials ? "#126BFF" : "#FF3347",
                          fontSize: "12.5px",
                          fontWeight: "700",
                        }}
                      >
                        {sMaterials.length} {sMaterials.length === 1 ? "Material" : "Materials"}
                      </span>
                    </div>

                    {/* Skill Materials Content */}
                    <div
                      style={{
                        padding: "16px 20px",
                        backgroundColor: "#FAFBFD",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {!hasMaterials ? (
                        /* Empty State for Skill with 0 Materials */
                        <div
                          style={{
                            padding: "24px",
                            textAlign: "center",
                            backgroundColor: "#FFFFFF",
                            borderRadius: "12px",
                            border: "1px dashed #DCE6F3",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "14px", color: "#5D78A3", fontWeight: "500" }}>
                            No materials added for this skill yet.
                          </span>
                          {hasMissingSkillMaterials && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQuizSkillForAdd(String(skill.id));
                                setShowQuizAddModal(true);
                              }}
                              style={{
                                height: "36px",
                                padding: "0 16px",
                                borderRadius: "8px",
                                border: "1px solid #126BFF",
                                backgroundColor: "#EEF4FB",
                                color: "#126BFF",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <Plus size={14} /> Add Material for this skill
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Materials List for this Skill */
                        sMaterials.map((mat, idx) => (
                          <MaterialRow
                            key={mat.id}
                            material={mat}
                            index={idx}
                            onPreview={() => navigate(`/teacher/materials/${mat.id}/preview`)}
                            onEdit={() => {
                              if (mat.material_type === "VIDEO") {
                                navigate(
                                  `/teacher/materials/video/${mat.id}/edit?quizId=${quizData?.id}&lessonId=${quizData?.lesson}&skillId=${skill.id}`
                                );
                              } else {
                                navigate(
                                  `/teacher/materials/note/${mat.id}/edit?quizId=${quizData?.id}&lessonId=${quizData?.lesson}&skillId=${skill.id}`
                                );
                              }
                            }}
                            onDelete={() => handleDeleteQuizMaterial(mat.id)}
                            onMoveUp={() => {}}
                            onMoveDown={() => {}}
                            canMoveUp={false}
                            canMoveDown={false}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ================================================== */}
      {/* 1. MAIN MATERIAL LIST VIEW (GROUPED BY LESSON + SKILL) */}
      {/* ================================================== */}
      {viewMode === "list" && (
        <>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#EAF3FF",
                  color: "#126BFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#0B1F3A" }}>
                  Learning Materials
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3" }}>
                  Manage, create, and sequence ordered learning content grouped by Lesson and Skill.
                </p>
              </div>
            </div>

            {/* Primary Action Button: + Add Material */}
            <button
              type="button"
              onClick={() => {
                setSelectedLessonId("");
                setSelectedSkillId("");
                setSearchParams({});
                setViewMode("workspace");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "46px",
                padding: "0 24px",
                borderRadius: "9px",
                border: "none",
                background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
                whiteSpace: "nowrap",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              + Add Material
            </button>
          </div>

          {/* Main List Container */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
            }}
          >
            {/* Search and Filters */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                marginBottom: "20px",
                gap: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  color: "#3D5E8A",
                  textTransform: "uppercase",
                }}
              >
                LESSON & SKILL GROUPS ({filteredGroups.length})
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {/* Search */}
                <div style={{ position: "relative", flex: isMobile ? "1" : "none", width: isMobile ? "auto" : "280px" }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#5D78A3",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by lesson or skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px 0 42px",
                      borderRadius: "9px",
                      border: "1px solid #DCE6F3",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0B1F3A",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    height: "42px",
                    width: "140px",
                    padding: "0 14px",
                    borderRadius: "9px",
                    border: "1px solid #DCE6F3",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0B1F3A",
                    backgroundColor: "#fff",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                >
                  <option value="All Types">All Types</option>
                  <option value="Text">Note</option>
                  <option value="Video">Video</option>
                  <option value="PDF">Document</option>
                </select>

                {(searchTerm.trim() !== "" || filterType !== "All Types") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("All Types");
                    }}
                    aria-label="Clear active filters"
                    style={{
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #DCE6F3",
                      color: "#3D5E8A",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F4F8FD";
                      e.currentTarget.style.borderColor = "#BFD0E5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#DCE6F3";
                    }}
                  >
                    <RotateCcw size={15} /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Grouped Records List */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px", color: "#5D78A3" }}>
                Loading learning materials...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  color: "#5D78A3",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "12px",
                  border: "1px dashed #DCE6F3",
                }}
              >
                <Layers size={36} color="#94A3B8" style={{ marginBottom: "12px" }} />
                <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0B1F3A" }}>
                  No material groups found
                </h4>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Click <strong>+ Add Material</strong> above to select a Lesson & Skill and create materials.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredGroups.map((group) => (
                  <div
                    key={group.key}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #DCE6F3",
                      borderRadius: "12px",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 6px rgba(18, 63, 110, 0.02)",
                    }}
                  >
                    {/* Left Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <BookOpen size={16} color="#126BFF" />
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#5D78A3" }}>
                            Lesson:
                          </span>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                            {group.lessonTitle}
                          </span>
                        </div>

                        <span style={{ color: "#CBD5E0" }}>•</span>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Target size={16} color="#126BFF" />
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#5D78A3" }}>
                            Skill:
                          </span>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#126BFF" }}>
                            {group.skillName}
                          </span>
                        </div>
                      </div>

                      {/* Material count & type badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                        <span
                          style={{
                            backgroundColor: "#EAF3FF",
                            color: "#126BFF",
                            fontSize: "12px",
                            fontWeight: "700",
                            padding: "3px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          {group.materialCount} {group.materialCount === 1 ? "Material" : "Materials"}
                        </span>

                        <div style={{ display: "flex", gap: "6px" }}>
                          {group.types.map((t) => (
                            <span
                              key={t}
                              style={{
                                backgroundColor:
                                  t === "VIDEO" ? "#F1EDFF" : t === "PDF" ? "#FEE2E2" : "#F1F5F9",
                                color:
                                  t === "VIDEO" ? "#6C4BFF" : t === "PDF" ? "#B91C1C" : "#475569",
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                textTransform: "uppercase",
                              }}
                            >
                              {t === "TEXT" ? "NOTE" : t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions: View Materials & Manage Buttons */}
                    <div style={{ display: "flex", gap: "8px", width: isMobile ? "100%" : "auto" }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/materials/${group.lessonId}/${group.skillId}/view`)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          height: "40px",
                          padding: "0 16px",
                          borderRadius: "8px",
                          border: "1px solid #DCE6F3",
                          backgroundColor: "#F8FAFC",
                          color: "#126BFF",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap",
                          flex: isMobile ? "1" : "none",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#EAF3FF";
                          e.currentTarget.style.borderColor = "#BAE0FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#F8FAFC";
                          e.currentTarget.style.borderColor = "#DCE6F3";
                        }}
                      >
                        <Eye size={16} />
                        <span>View Materials</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openWorkspaceForGroup(group.lessonId, group.skillId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          height: "40px",
                          padding: "0 16px",
                          borderRadius: "8px",
                          border: "1px solid #DCE6F3",
                          backgroundColor: "#F8FAFC",
                          color: "#126BFF",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap",
                          flex: isMobile ? "1" : "none",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#EAF3FF";
                          e.currentTarget.style.borderColor = "#BAE0FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#F8FAFC";
                          e.currentTarget.style.borderColor = "#DCE6F3";
                        }}
                      >
                        <span>Manage</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================== */}
      {/* 2. ADD MATERIAL WORKSPACE / CREATION VIEW */}
      {/* ================================================== */}
      {viewMode === "workspace" && (
        <>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                onClick={returnToMainList}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  color: "#5D78A3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Return to Materials List"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#0B1F3A" }}>
                  Material Workspace
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
                  Select a Lesson & Skill, add multiple videos, notes, and attachments, and define their learning sequence.
                </p>
              </div>
            </div>

            {/* Save & Return / Done Button */}
            <button
              type="button"
              onClick={returnToMainList}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "44px",
                padding: "0 22px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#FFFFFF",
                color: "#0B1F3A",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                whiteSpace: "nowrap",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <CheckCircle2 size={18} color="#16B978" />
              Save & Return to Materials
            </button>
          </div>

          {/* Lesson + Skill Selection Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto",
                gap: "20px",
                alignItems: "end",
              }}
            >
              {/* Step 1: Select Lesson */}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#234A7A",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Step 1: Select Lesson <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <BookOpen
                    size={18}
                    style={{
                      position: "absolute",
                      left: "14px",
                      color: "#126BFF",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    value={selectedLessonId}
                    onChange={(e) => handleLessonChange(e.target.value)}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px 0 42px",
                      borderRadius: "9px",
                      border: "1px solid #DCE6F3",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0B1F3A",
                      backgroundColor: "#fff",
                      appearance: "none",
                    }}
                  >
                    <option value="">-- Select Lesson --</option>
                    {lessonsList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Select Skill (Loads ONLY skills for selected Lesson) */}
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#234A7A",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Step 2: Select Skill <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Target
                    size={18}
                    style={{
                      position: "absolute",
                      left: "14px",
                      color: "#126BFF",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    value={selectedSkillId}
                    onChange={(e) => {
                      setSelectedSkillId(e.target.value);
                      if (selectedLessonId && e.target.value) {
                        setSearchParams({ lessonId: selectedLessonId, skillId: e.target.value });
                      }
                    }}
                    disabled={!selectedLessonId}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px 0 42px",
                      borderRadius: "9px",
                      border: "1px solid #DCE6F3",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0B1F3A",
                      backgroundColor: "#fff",
                      appearance: "none",
                      cursor: !selectedLessonId ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="">
                      {skillsList.length === 0
                        ? selectedLessonId
                          ? "-- No Skills Found --"
                          : "-- Select Lesson First --"
                        : "-- Select Skill --"}
                    </option>
                    {skillsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* + Add New Material Button inside workspace */}
              <div>
                <button
                  type="button"
                  disabled={!isSelectionComplete}
                  onClick={() => setShowTypeModal(true)}
                  onMouseEnter={() => setHoverAddMaterial(true)}
                  onMouseLeave={() => setHoverAddMaterial(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    height: "46px",
                    padding: "0 22px",
                    borderRadius: "9px",
                    border: "none",
                    background: !isSelectionComplete
                      ? "#CBD5E0"
                      : "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: !isSelectionComplete ? "not-allowed" : "pointer",
                    boxShadow: !isSelectionComplete
                      ? "none"
                      : "0 5px 14px rgba(18, 107, 255, 0.20)",
                    transform: hoverAddMaterial && isSelectionComplete ? "translateY(-1px)" : "none",
                    transition: "all 150ms ease",
                    whiteSpace: "nowrap",
                    width: isMobile ? "100%" : "auto",
                  }}
                  title={
                    !isSelectionComplete
                      ? "Please select both Lesson and Skill to add materials"
                      : "Add new material to this skill"
                  }
                >
                  <Plus size={18} strokeWidth={2.5} />
                  + Add New Material
                </button>
              </div>
            </div>

            {/* Selected Context Bar */}
            {isSelectionComplete && (
              <div
                style={{
                  backgroundColor: "#F0F6FF",
                  border: "1px solid #BAE0FF",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  gap: "24px",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} color="#126BFF" />
                    <span style={{ fontSize: "13px", color: "#5D78A3" }}>Selected Lesson:</span>
                    <strong style={{ fontSize: "14px", color: "#0B1F3A" }}>
                      {selectedLessonObj ? selectedLessonObj.title : `Lesson #${selectedLessonId}`}
                    </strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Target size={18} color="#126BFF" />
                    <span style={{ fontSize: "13px", color: "#5D78A3" }}>Selected Skill:</span>
                    <strong style={{ fontSize: "14px", color: "#0B1F3A" }}>
                      {selectedSkillObj ? selectedSkillObj.name : `Skill #${selectedSkillId}`}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/teacher/materials/${selectedLessonId}/${selectedSkillId}/view`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "36px",
                    padding: "0 14px",
                    borderRadius: "7px",
                    border: "1px solid #126BFF",
                    backgroundColor: "#FFFFFF",
                    color: "#126BFF",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#EEF4FB";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }}
                >
                  <Eye size={15} />
                  <span>View Student Preview</span>
                </button>
              </div>
            )}
          </div>

          {/* Ordered Materials List Container */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E4ECF6",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                marginBottom: "20px",
                gap: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  color: "#3D5E8A",
                  textTransform: "uppercase",
                }}
              >
                ORDERED LEARNING CONTENT ({filteredWorkspaceMaterials.length})
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {/* Search */}
                <div style={{ position: "relative", flex: isMobile ? "1" : "none", width: isMobile ? "auto" : "260px" }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#5D78A3",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px 0 42px",
                      borderRadius: "9px",
                      border: "1px solid #DCE6F3",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0B1F3A",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    height: "42px",
                    width: "130px",
                    padding: "0 14px",
                    borderRadius: "9px",
                    border: "1px solid #DCE6F3",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0B1F3A",
                    backgroundColor: "#fff",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                >
                  <option value="All Types">All Types</option>
                  <option value="Text">Note</option>
                  <option value="Video">Video</option>
                  <option value="PDF">Document</option>
                </select>
              </div>
            </div>

            {/* List of Materials */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#5D78A3" }}>
                  Loading workspace materials...
                </div>
              ) : !selectedSkillId ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#5D78A3" }}>
                  Please select a Lesson and Skill above to view and sequence learning materials.
                </div>
              ) : filteredWorkspaceMaterials.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#5D78A3" }}>
                  No learning materials exist for this skill yet. Click <strong>+ Add New Material</strong> above to add one.
                </div>
              ) : (
                filteredWorkspaceMaterials.map((material, idx) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    index={idx}
                    onPreview={() => navigate(`/teacher/materials/${material.id}/preview`)}
                    onEdit={() => {
                      if (material.material_type === "VIDEO") {
                        navigate(
                          `/teacher/materials/video/${material.id}/edit?lessonId=${selectedLessonId}&skillId=${selectedSkillId}`
                        );
                      } else {
                        navigate(
                          `/teacher/materials/note/${material.id}/edit?lessonId=${selectedLessonId}&skillId=${selectedSkillId}`
                        );
                      }
                    }}
                    onDelete={() => handleDeleteMaterial(material.id)}
                    onMoveUp={() => moveItem(idx, "up")}
                    onMoveDown={() => moveItem(idx, "down")}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < filteredWorkspaceMaterials.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ================================================== */}
      {/* 3. COMPACT MATERIAL TYPE SELECTION MODAL */}
      {/* ================================================== */}
      {showTypeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 31, 58, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowTypeModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(6, 38, 83, 0.15)",
              border: "1px solid #DCE6F3",
              width: "100%",
              maxWidth: "520px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
                  Select Material Type
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
                  Choose the format of learning content you want to create.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTypeModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#5D78A3",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "6px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Material Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Option 1: Video */}
              <div
                onClick={() => {
                  setShowTypeModal(false);
                  navigate(
                    `/teacher/materials/video/create?lessonId=${selectedLessonId}&skillId=${selectedSkillId}`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#F1EDFF",
                      color: "#6C4BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Video size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Interactive Video
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Upload MP4/WebM video with timeline quiz questions.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>

              {/* Option 2: Note */}
              <div
                onClick={() => {
                  setShowTypeModal(false);
                  navigate(
                    `/teacher/materials/note/create?lessonId=${selectedLessonId}&skillId=${selectedSkillId}`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#EAF3FF",
                      color: "#126BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Learning Note
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Create rich text study notes, summaries, and explanations.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>

              {/* Option 3: Attachment / Document */}
              <div
                onClick={() => {
                  setShowTypeModal(false);
                  navigate(
                    `/teacher/materials/note/create?lessonId=${selectedLessonId}&skillId=${selectedSkillId}&type=attachment`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Paperclip size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Attachment / Document
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Upload worksheets, PDF documents, or slides.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 4. QUIZ ADD MATERIAL SELECTION MODAL */}
      {/* ================================================== */}
      {showQuizAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 31, 58, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowQuizAddModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(6, 38, 83, 0.15)",
              border: "1px solid #DCE6F3",
              width: "100%",
              maxWidth: "520px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
                  Add Material for Quiz
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
                  Select a skill needing learning material and choose a format.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuizAddModal(false)}
                style={{ background: "none", border: "none", color: "#5D78A3", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Skill Selector */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#234A7A", marginBottom: "8px", display: "block" }}>
                Target Quiz Skill <span style={{ color: "#FF4054" }}>*</span>
              </label>
              <select
                value={selectedQuizSkillForAdd}
                onChange={(e) => setSelectedQuizSkillForAdd(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "9px",
                  border: "1px solid #DCE6F3",
                  fontSize: "14px",
                  outline: "none",
                  color: "#0B1F3A",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <option value="">-- Select Skill Needing Material --</option>
                {missingQuizSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Needs Material)
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                onClick={() => {
                  if (!selectedQuizSkillForAdd) {
                    alert("Please select a target skill first.");
                    return;
                  }
                  setShowQuizAddModal(false);
                  navigate(
                    `/teacher/materials/video/create?quizId=${quizData?.id}&lessonId=${quizData?.lesson}&skillId=${selectedQuizSkillForAdd}`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#F1EDFF",
                      color: "#6C4BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Video size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Interactive Video
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Upload MP4 video with timeline questions.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>

              <div
                onClick={() => {
                  if (!selectedQuizSkillForAdd) {
                    alert("Please select a target skill first.");
                    return;
                  }
                  setShowQuizAddModal(false);
                  navigate(
                    `/teacher/materials/note/create?quizId=${quizData?.id}&lessonId=${quizData?.lesson}&skillId=${selectedQuizSkillForAdd}`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#EAF3FF",
                      color: "#126BFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Learning Note
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Create rich text study notes and explanations.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>

              <div
                onClick={() => {
                  if (!selectedQuizSkillForAdd) {
                    alert("Please select a target skill first.");
                    return;
                  }
                  setShowQuizAddModal(false);
                  navigate(
                    `/teacher/materials/note/create?quizId=${quizData?.id}&lessonId=${quizData?.lesson}&skillId=${selectedQuizSkillForAdd}&type=attachment`
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "12px",
                  border: "1px solid #DCE6F3",
                  backgroundColor: "#F8FAFC",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#126BFF";
                  e.currentTarget.style.backgroundColor = "#F0F6FF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#DCE6F3";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Paperclip size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0B1F3A" }}>
                      Attachment / Document
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Upload worksheets, PDF documents, or slides.
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#126BFF" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialList;
