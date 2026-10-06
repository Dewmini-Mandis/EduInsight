import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Search,
  BookOpen,
  Target,
  RotateCcw,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface ComparisonRow {
  id: number;
  name: string;
  className: string;
  avgScore: number;
  latestScore: number;
  progressPct: number;
  attemptsCount: number;
  riskLevel: "High Risk" | "Not High Risk";
}

// Pass/Fail Distribution Doughnut Chart
const RenderPassFailDoughnut: React.FC<{ passCount: number; failCount: number }> = ({
  passCount,
  failCount,
}) => {
  const total = passCount + failCount || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const segs = [
    { label: "Passed", count: passCount, color: "#10B981" },
    { label: "Failed / Needs Practice", count: failCount, color: "#EF4444" },
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
          <div style={{ fontSize: "11px", color: "#5D78A3" }}>Students</div>
        </div>
      </div>
    </div>
  );
};

// Lesson Bar Chart Component for Class Report Overview
const RenderClassReportLessonChart: React.FC = () => {
  const width = 800;
  const height = 200;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;

  const dataPoints = [
    { lessonName: "Perimeter", score: 78 },
    { lessonName: "Fractions", score: 68 },
    { lessonName: "Square Root", score: 58 },
    { lessonName: "Algebra", score: 82 },
    { lessonName: "Geometry", score: 74 },
  ];

  const barWidth = Math.min(32, (chartW / dataPoints.length) * 0.45);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ height: "24px", marginBottom: "12px" }} />
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

        {dataPoints.map((item, idx) => {
          const cx = paddingX + ((idx + 0.5) / dataPoints.length) * chartW;
          const x = cx - barWidth / 2;
          const h = (item.score / 100) * chartH;
          const y = paddingY + chartH - h;

          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={Math.max(3, h)} rx="4" ry="4" fill="#126BFF" />
              <text x={cx} y={height - 10} fill="#0B1F3A" fontSize="12" textAnchor="middle" fontWeight="600">
                {item.lessonName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const TeacherClassReportPage: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState("All Terms");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [activeTab, setActiveTab] = useState<"overview" | "lessons" | "skills" | "comparison">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<boolean>(true);

  const [termsList, setTermsList] = useState<string[]>(["All Terms"]);
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [classAvgScore, setClassAvgScore] = useState<number>(0);
  const [classPassRate, setClassPassRate] = useState<number>(0);
  const [atRiskCount, setAtRiskCount] = useState<number>(0);

  useEffect(() => {
    fetchClassReportData();
  }, [selectedTerm, selectedClass]);

  const fetchClassReportData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const headers = { Authorization: `Token ${token}` };

      const [termsRes, classesRes, studentsRes, attemptsRes, riskRes] = await Promise.allSettled([
        fetch("/api/quizzes/terms/", { headers }),
        fetch("/api/classes/classrooms/", { headers }),
        fetch("/api/classes/students/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/analytics/risk/", { headers }),
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

      let students: any[] = [];
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const sJson = await studentsRes.value.json();
        students = Array.isArray(sJson) ? sJson : sJson.results || [];
      }
      setTotalStudentsCount(students.length);

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }
      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

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

      const highRiskIds = new Set(
        Array.from(riskMap.entries())
          .filter(([_, val]) => val === "High Risk")
          .map(([id]) => id)
      );
      setAtRiskCount(highRiskIds.size);

      if (validAttempts.length > 0) {
        const totalScore = validAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
        setClassAvgScore(Math.round(totalScore / validAttempts.length));

        const passed = validAttempts.filter((a) => (a.score || 0) >= 60).length;
        setClassPassRate(Math.round((passed / validAttempts.length) * 100));
      } else {
        setClassAvgScore(0);
        setClassPassRate(0);
      }

      const comparison: ComparisonRow[] = students.map((s, idx) => {
        const sId = s.id || idx + 1;
        const name = s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || `Student #${sId}`;
        const sAtts = validAttempts.filter((a: any) => (a.student || a.student_id) === sId);
        sAtts.sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());

        const avgScore = sAtts.length > 0 ? Math.round(sAtts.reduce((acc, a) => acc + (a.score || 0), 0) / sAtts.length) : (s.average_score ?? 0);
        const latestScore = sAtts.length > 0 ? Math.round(sAtts[sAtts.length - 1].score || 0) : (s.latest_score ?? 0);
        const passedCount = sAtts.filter((a) => (a.score || 0) >= 60).length;
        const progressPct = sAtts.length > 0 ? Math.round((passedCount / sAtts.length) * 100) : 0;
        const riskLevel = (riskMap.get(sId) as "High Risk" | "Not High Risk") || "Not High Risk";

        return {
          id: sId,
          name,
          className: s.grade_class || s.student_class || "Class",
          avgScore,
          latestScore,
          progressPct,
          attemptsCount: sAtts.length,
          riskLevel,
        };
      });

      setComparisonData(comparison);
    } catch (err) {
      console.error("Failed to load class report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredComparison = useMemo(() => {
    return comparisonData.filter((c) =>
      searchTerm ? c.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
    );
  }, [comparisonData, searchTerm]);

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER WITH DOWNLOAD ACTION */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Class Report
          </h1>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
            View overall class performance and learning analytics.
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
          Download Class Report
        </button>
      </div>

      {/* FILTERS */}
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
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Total Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{totalStudentsCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #169BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Class Average</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{classAvgScore}%</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#169BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Pass Rate</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{classPassRate}%</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>At-Risk Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>04</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { id: "overview", label: "Overview" },
          { id: "lessons", label: "Lesson Performance" },
          { id: "skills", label: "Skill Performance" },
          { id: "comparison", label: "Student Comparison" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 600,
              border: "none",
              backgroundColor: activeTab === tab.id ? "#126BFF" : "#FFFFFF",
              color: activeTab === tab.id ? "#FFFFFF" : "#5D78A3",
              boxShadow: activeTab === tab.id ? "0 4px 12px rgba(18, 107, 255, 0.25)" : "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Average Score by Lesson</h2>
              <RenderClassReportLessonChart />
            </div>

            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Pass/Fail Distribution</h2>
              <RenderPassFailDoughnut passCount={27} failCount={5} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "lessons" && (
        <div className="teacher-card" style={{ padding: "24px 28px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Class Lesson Performance Summary</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Lesson</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Pass Rate</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Completion %</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>First vs Latest Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Perimeter</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>78%</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#059669" }}>85%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>92%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#126BFF" }}>60% &rarr; 80% (+20%)</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Fractions</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>68%</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#059669" }}>72%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>84%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#126BFF" }}>45% &rarr; 72% (+27%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "skills" && (
        <div className="teacher-card" style={{ padding: "24px 28px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Class Skill Proficiency Summary</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Skill</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Students Struggling</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Perimeter Calculation</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>85%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>2 students</td>
                <td style={{ padding: "14px 12px" }}>
                  <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Strong</span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E7EEF7" }}>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Fraction Simplification</td>
                <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>62%</td>
                <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>6 students</td>
                <td style={{ padding: "14px 12px" }}>
                  <span style={{ padding: "4px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FFFBEB", color: "#D97706" }}>Needs Practice</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "comparison" && (
        <div className="teacher-card" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Student Academic Comparison</h2>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search size={16} color="#5D78A3" style={{ position: "absolute", left: "12px", top: "10px" }} />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "6px 14px 6px 36px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none" }}
              />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Student</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Latest Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Progress</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Attempts</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredComparison.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                  <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{row.name}</td>
                  <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{row.avgScore}%</td>
                  <td style={{ padding: "14px 12px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{row.latestScore}%</td>
                  <td style={{ padding: "14px 12px", fontSize: "14px", color: "#0B1F3A" }}>{row.progressPct}%</td>
                  <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>{row.attemptsCount}</td>
                  <td style={{ padding: "14px 12px" }}>
                    {row.riskLevel === "High Risk" ? (
                      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444" }}>High Risk</span>
                    ) : (
                      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>Not High Risk</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherClassReportPage;
