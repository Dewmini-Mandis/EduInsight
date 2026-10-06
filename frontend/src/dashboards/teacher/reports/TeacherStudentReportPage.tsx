import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  BookOpen,
  Target,
  HelpCircle,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface StudentOption {
  id: number;
  name: string;
  className: string;
  indexNo: string;
  avgScore: number;
  passRate: number;
  riskLevel: "High Risk" | "Not High Risk";
  lessonsCompleted: string;
  skillsMastered: string;
  quizzesAttempted: number;
}

// Line Chart Component for Performance Trend in Student Report
const RenderReportTrendChart: React.FC = () => {
  const width = 800;
  const height = 200;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;

  const pointsData = [
    { label: "Quiz 1", score: 65, dateStr: "Aug 15" },
    { label: "Quiz 2", score: 75, dateStr: "Aug 24" },
    { label: "Quiz 3", score: 60, dateStr: "Sep 02" },
    { label: "Quiz 4", score: 85, dateStr: "Sep 14" },
    { label: "Quiz 5", score: 80, dateStr: "Sep 22" },
    { label: "Quiz 6", score: 88, dateStr: "Sep 28" },
  ];

  const points = pointsData.map((pt, idx) => {
    const x = paddingX + (idx / (pointsData.length - 1)) * chartW;
    const y = paddingY + chartH - (pt.score / 100) * chartH;
    return { x, y, pt };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 25, 50, 75, 100].map((gridVal) => {
          const yGrid = paddingY + chartH - (gridVal / 100) * chartH;
          return (
            <g key={gridVal}>
              <line x1={paddingX} y1={yGrid} x2={width - paddingX} y2={yGrid} stroke="#E7EEF7" strokeDasharray="4 4" />
              <text x={paddingX - 10} y={yGrid + 4} fill="#9AAAC1" fontSize="11" textAnchor="end" fontWeight="500">
                {gridVal}%
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => (
          <text key={idx} x={p.x} y={height - 10} fill="#9AAAC1" fontSize="11" textAnchor="middle" fontWeight="500">
            {p.pt.dateStr}
          </text>
        ))}

        <defs>
          <linearGradient id="reportAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#126BFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#126BFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <polygon points={`${paddingX},${paddingY + chartH} ${polylineStr} ${width - paddingX},${paddingY + chartH}`} fill="url(#reportAreaFill)" />
        <polyline fill="none" stroke="#126BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={polylineStr} />

        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke="#126BFF" strokeWidth="2.2" />
            <circle cx={p.x} cy={p.y} r="2" fill="#126BFF" />
          </g>
        ))}
      </svg>
    </div>
  );
};

const TeacherStudentReportPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    fetchStudentReportData();
  }, []);

  const fetchStudentReportData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const headers = { Authorization: `Token ${token}` };

      const [studentsRes, attemptsRes, lessonsRes, skillsRes, riskRes] = await Promise.allSettled([
        fetch("/api/classes/students/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/quizzes/lessons/", { headers }),
        fetch("/api/quizzes/skills/", { headers }),
        fetch("/api/analytics/risk/", { headers }),
      ]);

      let students: any[] = [];
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const json = await studentsRes.value.json();
        students = Array.isArray(json) ? json : json.results || [];
      }

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }
      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

      let lessons: any[] = [];
      if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
        const lJson = await lessonsRes.value.json();
        lessons = Array.isArray(lJson) ? lJson : lJson.results || [];
      }

      let skills: any[] = [];
      if (skillsRes.status === "fulfilled" && skillsRes.value.ok) {
        const skJson = await skillsRes.value.json();
        skills = Array.isArray(skJson) ? skJson : skJson.results || [];
      }

      let riskMap = new Map<number, string>();
      if (riskRes.status === "fulfilled" && riskRes.value.ok) {
        const rJson = await riskRes.value.json();
        const rArr = Array.isArray(rJson) ? rJson : rJson.results || [];
        rArr.forEach((r: any) => {
          const sId = r.student || r.student_id;
          if (sId) {
            const category = (r.risk_category || "").toString();
            riskMap.set(sId, category.toUpperCase().includes("HIGH") && !category.toUpperCase().includes("NOT HIGH") ? "High Risk" : "Not High Risk");
          }
        });
      }

      const options: StudentOption[] = students.map((s, idx) => {
        const sId = s.id || idx + 1;
        const name = s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || `Student #${sId}`;
        const sAtts = validAttempts.filter((a: any) => (a.student || a.student_id) === sId);

        const avgScore = sAtts.length > 0 ? Math.round(sAtts.reduce((acc, a) => acc + (a.score || 0), 0) / sAtts.length) : (s.average_score ?? 0);
        const passedCount = sAtts.filter((a) => (a.score || 0) >= 60).length;
        const passRate = sAtts.length > 0 ? Math.round((passedCount / sAtts.length) * 100) : 0;
        const riskLevel = (riskMap.get(sId) as "High Risk" | "Not High Risk") || "Not High Risk";

        const attemptedLessonIds = new Set(sAtts.map((a) => a.quiz_lesson_id || a.quiz?.lesson?.id || a.quiz?.lesson));
        const attemptedSkillIds = new Set(sAtts.map((a) => a.quiz_skill_id || a.quiz?.skill?.id || a.quiz?.skill));

        return {
          id: sId,
          name,
          className: s.grade_class || s.student_class || "Class",
          indexNo: s.index_no || `STD-${1000 + sId}`,
          avgScore,
          passRate,
          riskLevel,
          lessonsCompleted: `${attemptedLessonIds.size} / ${lessons.length || 15}`,
          skillsMastered: `${attemptedSkillIds.size} / ${skills.length || 12}`,
          quizzesAttempted: sAtts.length,
        };
      });

      setStudentOptions(options);
      if (options.length > 0) {
        setSelectedStudentId(options[0].id);
      }
    } catch (err) {
      console.error("Failed to load student report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentStudent = useMemo(() => {
    if (!selectedStudentId) return studentOptions[0] || null;
    return studentOptions.find((s) => s.id === selectedStudentId) || studentOptions[0] || null;
  }, [selectedStudentId, studentOptions]);

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER WITH DOWNLOAD ACTION */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Student Report
          </h1>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
            View a comprehensive performance report for an individual student.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadReport}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: "#126BFF",
            color: "#FFFFFF",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(18, 107, 255, 0.25)",
          }}
        >
          <Download size={18} />
          Download Report
        </button>
      </div>

      {/* STUDENT SELECTOR */}
      <div className="teacher-card" style={{ padding: "16px 28px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Select Student:</label>
        <select
          value={selectedStudentId ?? ""}
          onChange={(e) => setSelectedStudentId(Number(e.target.value))}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #DCE6F3",
            fontSize: "15px",
            fontWeight: 600,
            color: "#0B1F3A",
            minWidth: "260px",
          }}
        >
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.className})
            </option>
          ))}
        </select>
      </div>

      {!currentStudent ? (
        <div className="teacher-card" style={{ padding: "24px 28px", textAlign: "center", color: "#5D78A3" }}>
          {loading ? "Loading student report..." : "No student data available."}
        </div>
      ) : (
        <>

      {/* TOP STUDENT PROFILE SUMMARY CARD */}
      <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: "24px", backgroundColor: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A" }}>{currentStudent.name}</div>
            <div style={{ fontSize: "14px", color: "#5D78A3", marginTop: "4px" }}>
              Class: <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{currentStudent.className}</span> &bull; Student ID: <span style={{ fontWeight: 600, color: "#0B1F3A" }}>{currentStudent.indexNo}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", color: "#5D78A3", fontWeight: 500 }}>Average Score</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A" }}>{currentStudent.avgScore}%</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "#5D78A3", fontWeight: 500 }}>Pass Rate</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#059669" }}>{currentStudent.passRate}%</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "#5D78A3", fontWeight: 500 }}>Risk Status</div>
              {currentStudent.riskLevel === "High Risk" ? (
                <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "13px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", display: "inline-block", marginTop: "4px" }}>
                  High Risk
                </span>
              ) : (
                <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "13px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", display: "inline-block", marginTop: "4px" }}>
                  Not High Risk
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACADEMIC OVERVIEW CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Lessons Completed</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{currentStudent.lessonsCompleted}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Skills Mastered</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{currentStudent.skillsMastered}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Quizzes Attempted</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{currentStudent.quizzesAttempted}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HelpCircle size={24} />
          </div>
        </div>
      </div>

      {/* SECTION 1: PERFORMANCE TREND CHART */}
      <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Performance Trend</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Student evaluation scores over recent quizzes.</p>
        </div>
        <RenderReportTrendChart />
      </div>

      {/* SECTION 2 & 3: SKILL MASTERY & LESSON PROGRESS TABLES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* Skill Mastery */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Skill Mastery</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Proficiency breakdown across target curriculum skills.</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Skill</th>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Mastery</th>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Perimeter Calculation</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>85%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Strong</span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Fraction Simplification</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>62%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FFFBEB", color: "#D97706" }}>Improving</span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Algebraic Expressions</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>78%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#EAF3FF", color: "#126BFF" }}>On Track</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lesson Progress */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Lesson Progress</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Summary of lesson completion and quiz scores.</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Lesson</th>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Latest Score</th>
                <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Perimeter</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>80%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Completed</span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Fractions</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>72%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#EAF3FF", color: "#126BFF" }}>In Progress</span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Algebra Basics</td>
                <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>82%</td>
                <td style={{ padding: "12px 10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Completed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: RISK & IMPROVEMENT LOG */}
      <div className="teacher-card" style={{ padding: "24px 28px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Risk & Remedial History</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Historical ML model risk assessments and remedial gains.</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
              <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Assessment Context</th>
              <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Initial Score</th>
              <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Reassessment Score</th>
              <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Net Improvement</th>
              <th style={{ padding: "10px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Model Classification</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
              <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Fractions Remediation</td>
              <td style={{ padding: "12px 10px", fontSize: "14px", color: "#0B1F3A" }}>50%</td>
              <td style={{ padding: "12px 10px", fontSize: "14px", color: "#0B1F3A" }}>72%</td>
              <td style={{ padding: "12px 10px", fontSize: "14px", fontWeight: 600, color: "#059669" }}>+22%</td>
              <td style={{ padding: "12px 10px" }}>
                <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Not High Risk</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

export default TeacherStudentReportPage;
