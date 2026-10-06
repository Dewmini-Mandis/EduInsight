import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Filter,
  TrendingUp,
  Award,
  RotateCcw,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface SkillPerfItem {
  id: string;
  skillName: string;
  avgScore: number;
  studentsStruggling: number;
  status: "Strong" | "On Track" | "Improving" | "Needs Practice";
}

interface LessonPerfItem {
  id: string;
  lessonName: string;
  avgScore: number;
  passRate: number;
  completedStudents: number;
  strugglingStudents: number;
  status: "Strong" | "On Track" | "Improving" | "Needs Practice";
}

// Doughnut Chart for Skill Mastery Distribution
const RenderSkillDoughnut: React.FC<{ strongCount: number; improvingCount: number; practiceCount: number }> = ({
  strongCount,
  improvingCount,
  practiceCount,
}) => {
  const total = strongCount + improvingCount + practiceCount || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const segs = [
    { label: "Strong", count: strongCount, color: "#10B981" },
    { label: "Improving", count: improvingCount, color: "#126BFF" },
    { label: "Needs Practice", count: practiceCount, color: "#F59E0B" },
  ];

  let accumulatedAngle = 0;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "12px" }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color }} />
            {s.label} ({s.count})
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: "170px" }}>
        <svg width="170" height="170" viewBox="0 0 170 170">
          <g transform="rotate(-90 85 85)">
            {segs.map((seg) => {
              const dashOffset = circumference - (seg.count / total) * circumference;
              const rotation = accumulatedAngle;
              accumulatedAngle += (seg.count / total) * 360;

              return (
                <circle
                  key={seg.label}
                  cx="85"
                  cy="85"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(${rotation} 85 85)`}
                />
              );
            })}
          </g>
        </svg>
        <div style={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A" }}>{total}</div>
          <div style={{ fontSize: "11px", color: "#5D78A3" }}>Skills</div>
        </div>
      </div>
    </div>
  );
};

// Bar Chart for Most Challenging Skills
const RenderChallengingSkillsBar: React.FC<{ skills: SkillPerfItem[] }> = ({ skills }) => {
  const width = 800;
  const height = 210;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;
  const barWidth = Math.min(30, (chartW / (skills.length || 1)) * 0.45);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ height: "24px", marginBottom: "12px" }} />
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 2, 4, 6, 8].map((gridVal) => {
          const yGrid = paddingY + chartH - (gridVal / 8) * chartH;
          return (
            <g key={gridVal}>
              <line x1={paddingX} y1={yGrid} x2={width - paddingX} y2={yGrid} stroke="#E7EEF7" strokeDasharray="4 4" />
              <text x={paddingX - 10} y={yGrid + 4} fill="#9AAAC1" fontSize="11" textAnchor="end" fontWeight="500">
                {gridVal}
              </text>
            </g>
          );
        })}

        {skills.map((item, idx) => {
          const cx = paddingX + ((idx + 0.5) / skills.length) * chartW;
          const x = cx - barWidth / 2;
          const h = (item.studentsStruggling / 8) * chartH;
          const y = paddingY + chartH - h;

          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={Math.max(3, h)} rx="4" ry="4" fill="#F59E0B" />
              <text x={cx} y={height - 10} fill="#0B1F3A" fontSize="11" textAnchor="middle" fontWeight="600">
                {item.skillName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TeacherSkillLessonAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"skills" | "lessons">("skills");
  const [selectedTerm, setSelectedTerm] = useState("All Terms");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [loading, setLoading] = useState<boolean>(true);

  const [termsList, setTermsList] = useState<string[]>(["All Terms"]);
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  const [skillItems, setSkillItems] = useState<SkillPerfItem[]>([]);
  const [lessonItems, setLessonItems] = useState<LessonPerfItem[]>([]);

  useEffect(() => {
    fetchSkillLessonData();
  }, [selectedTerm, selectedClass]);

  const fetchSkillLessonData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const headers = { Authorization: `Token ${token}` };

      const [termsRes, classesRes, skillsRes, lessonsRes, attemptsRes] = await Promise.allSettled([
        fetch("/api/quizzes/terms/", { headers }),
        fetch("/api/classes/classrooms/", { headers }),
        fetch("/api/quizzes/skills/", { headers }),
        fetch("/api/quizzes/lessons/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
      ]);

      if (termsRes.status === "fulfilled" && termsRes.value.ok) {
        const termsJson = await termsRes.value.json();
        const tArr = Array.isArray(termsJson) ? termsJson : termsJson.results || [];
        const tNames = tArr.map((t: any) => t.name).filter(Boolean);
        setTermsList(["All Terms", ...Array.from(new Set<string>(tNames))]);
      }

      if (classesRes.status === "fulfilled" && classesRes.value.ok) {
        const cJson = await classesRes.value.json();
        const cArr = Array.isArray(cJson) ? cJson : cJson.results || [];
        setClassList(cArr.map((c: any) => ({ id: String(c.id), name: c.name || c.grade_class })));
      }

      let skills: any[] = [];
      if (skillsRes.status === "fulfilled" && skillsRes.value.ok) {
        const sJson = await skillsRes.value.json();
        skills = Array.isArray(sJson) ? sJson : sJson.results || [];
      }

      let lessons: any[] = [];
      if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
        const lJson = await lessonsRes.value.json();
        lessons = Array.isArray(lJson) ? lJson : lJson.results || [];
      }

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }

      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

      // Compute Skill Performance
      const mappedSkills: SkillPerfItem[] = skills.map((sk: any) => {
        const skAtts = validAttempts.filter((a: any) => {
          const skId = a.quiz_skill_id || a.quiz?.skill?.id || a.quiz?.skill;
          return String(skId) === String(sk.id);
        });

        const avgScore = skAtts.length > 0 ? Math.round(skAtts.reduce((acc, a) => acc + (a.score || 0), 0) / skAtts.length) : 0;
        const strugglingCount = skAtts.filter((a) => (a.score || 0) < 60).length;

        let status: SkillPerfItem["status"] = "On Track";
        if (avgScore >= 80) status = "Strong";
        else if (avgScore >= 70) status = "On Track";
        else if (avgScore >= 60) status = "Improving";
        else status = "Needs Practice";

        return {
          id: String(sk.id),
          skillName: sk.name || sk.title || `Skill #${sk.id}`,
          avgScore,
          studentsStruggling: strugglingCount,
          status,
        };
      });

      setSkillItems(mappedSkills);

      // Compute Lesson Performance
      const mappedLessons: LessonPerfItem[] = lessons.map((l: any) => {
        const lAtts = validAttempts.filter((a: any) => {
          const lId = a.quiz_lesson_id || a.quiz?.lesson?.id || a.quiz?.lesson;
          return String(lId) === String(l.id);
        });

        const avgScore = lAtts.length > 0 ? Math.round(lAtts.reduce((acc, a) => acc + (a.score || 0), 0) / lAtts.length) : 0;
        const passedCount = lAtts.filter((a) => (a.score || 0) >= 60).length;
        const passRate = lAtts.length > 0 ? Math.round((passedCount / lAtts.length) * 100) : 0;
        const strugglingCount = lAtts.filter((a) => (a.score || 0) < 60).length;
        const uniqueStudents = new Set(lAtts.map((a) => a.student || a.student_id)).size;

        let status: LessonPerfItem["status"] = "On Track";
        if (avgScore >= 80) status = "Strong";
        else if (avgScore >= 70) status = "On Track";
        else if (avgScore >= 60) status = "Improving";
        else status = "Needs Practice";

        return {
          id: String(l.id),
          lessonName: l.title || `Lesson #${l.id}`,
          avgScore,
          passRate,
          completedStudents: uniqueStudents,
          strugglingStudents: strugglingCount,
          status,
        };
      });

      setLessonItems(mappedLessons);
    } catch (err) {
      console.error("Failed to fetch skill & lesson analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalSkillsCount = skillItems.length;
  const strongSkillsCount = skillItems.filter((s) => s.status === "Strong").length;
  const improvingSkillsCount = skillItems.filter((s) => s.status === "Improving" || s.status === "On Track").length;
  const difficultSkillsCount = skillItems.filter((s) => s.status === "Needs Practice").length;

  const renderStatusBadge = (status: SkillPerfItem["status"]) => {
    switch (status) {
      case "Strong":
        return <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>Strong</span>;
      case "On Track":
        return <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#EAF3FF", color: "#126BFF", border: "1px solid #BFDBFE" }}>On Track</span>;
      case "Improving":
        return <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>Improving</span>;
      case "Needs Practice":
        return <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5" }}>Needs Practice</span>;
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
          Skill & Lesson Analytics
        </h1>
        <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
          Identify strong and weak skills and analyze lesson performance.
        </p>
      </div>

      {/* FILTER ROW */}
      <div className="teacher-card" style={{ padding: "16px 28px", marginBottom: "20px", display: "flex", gap: "24px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={18} color="#5D78A3" />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Filters</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Term:</label>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
            {termsList.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Class:</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
            <option value="All Classes">All Classes</option>
            {classList.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {(selectedTerm !== "All Terms" || selectedClass !== "All Classes") && (
          <button
            type="button"
            onClick={() => {
              setSelectedTerm("All Terms");
              setSelectedClass("All Classes");
            }}
            style={{
              height: "38px",
              padding: "0 14px",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #DCE6F3",
              color: "#3D5E8A",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease"
            }}
          >
            <RotateCcw size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Total Skills</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{totalSkillsCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Strong Skills</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{String(strongSkillsCount).padStart(2, "0")}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #169BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Improving Skills</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{String(improvingSkillsCount).padStart(2, "0")}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#169BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Difficult Skills</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{String(difficultSkillsCount).padStart(2, "0")}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("skills")}
          style={{
            padding: "10px 24px",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 600,
            border: "none",
            backgroundColor: activeTab === "skills" ? "#126BFF" : "#FFFFFF",
            color: activeTab === "skills" ? "#FFFFFF" : "#5D78A3",
            boxShadow: activeTab === "skills" ? "0 4px 12px rgba(18, 107, 255, 0.25)" : "none",
            cursor: "pointer",
          }}
        >
          Skill Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lessons")}
          style={{
            padding: "10px 24px",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 600,
            border: "none",
            backgroundColor: activeTab === "lessons" ? "#126BFF" : "#FFFFFF",
            color: activeTab === "lessons" ? "#FFFFFF" : "#5D78A3",
            boxShadow: activeTab === "lessons" ? "0 4px 12px rgba(18, 107, 255, 0.25)" : "none",
            cursor: "pointer",
          }}
        >
          Lesson Performance
        </button>
      </div>

      {/* TAB CONTENT: SKILL PERFORMANCE */}
      {activeTab === "skills" ? (
        <>
          <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: "24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Skill Performance Table</h2>
              <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Overview of student skill proficiency and difficulty levels.</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Skill</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Students Struggling</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {skillItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.skillName}</td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.avgScore}%</td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#5D78A3" }}>{item.studentsStruggling} students</td>
                    <td style={{ padding: "16px" }}>{renderStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TWO SIDE-BY-SIDE CHARTS BELOW SKILL TABLE */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Skill Mastery Distribution</h2>
                <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Mastery breakdown across all evaluated skills.</p>
              </div>
              <RenderSkillDoughnut strongCount={8} improvingCount={5} practiceCount={3} />
            </div>

            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Most Challenging Skills</h2>
                <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Skills with highest count of struggling students.</p>
              </div>
              <RenderChallengingSkillsBar skills={skillItems} />
            </div>
          </div>
        </>
      ) : (
        /* TAB CONTENT: LESSON PERFORMANCE */
        <div className="teacher-card" style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Lesson Performance Table</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Comprehensive lesson completion and pass rates.</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Lesson</th>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Pass Rate</th>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Students Completed</th>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Students Struggling</th>
                <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lessonItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                  <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.lessonName}</td>
                  <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.avgScore}%</td>
                  <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#059669" }}>{item.passRate}%</td>
                  <td style={{ padding: "16px", fontSize: "14px", color: "#5D78A3" }}>{item.completedStudents} students</td>
                  <td style={{ padding: "16px", fontSize: "14px", color: "#5D78A3" }}>{item.strugglingStudents} students</td>
                  <td style={{ padding: "16px" }}>{renderStatusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherSkillLessonAnalyticsPage;
