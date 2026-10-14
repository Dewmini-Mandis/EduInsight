import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Award,
  BookOpen,
  AlertTriangle,
  Filter,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface LessonScoreItem {
  lessonName: string;
  avgScore: number;
  firstAttemptAvg: number;
  latestAttemptAvg: number;
}

interface StudentSummaryItem {
  id: string | number;
  name: string;
  improvementPct: number;
  latestScore: number;
  riskLevel: "High Risk" | "Not High Risk";
  className: string;
}

// Grouped Bar Chart Component for First vs Latest Attempt
const RenderFirstVsLatestChart: React.FC<{ dataPoints: LessonScoreItem[] }> = ({ dataPoints }) => {
  const [hoveredBar, setHoveredBar] = useState<{
    lessonName: string;
    type: "First Attempt" | "Latest Attempt";
    score: number;
    x: number;
    y: number;
  } | null>(null);

  const width = 800;
  const height = 210;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;

  const groupCount = dataPoints.length;
  const groupWidth = groupCount > 0 ? chartW / groupCount : chartW;
  const barWidth = Math.min(24, groupWidth * 0.26);
  const barGap = 5;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#93C5FD", display: "inline-block" }} />
          First Attempt Avg
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#126BFF", display: "inline-block" }} />
          Latest Attempt Avg
        </div>
      </div>

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
          const groupCenterX = paddingX + (idx + 0.5) * groupWidth;
          const bar1X = groupCenterX - barWidth - barGap / 2;
          const bar2X = groupCenterX + barGap / 2;

          const h1 = (item.firstAttemptAvg / 100) * chartH;
          const y1 = paddingY + chartH - h1;

          const h2 = (item.latestAttemptAvg / 100) * chartH;
          const y2 = paddingY + chartH - h2;

          return (
            <g key={idx}>
              <rect
                x={bar1X}
                y={y1}
                width={barWidth}
                height={Math.max(3, h1)}
                rx="3"
                ry="3"
                fill="#93C5FD"
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setHoveredBar({ lessonName: item.lessonName, type: "First Attempt", score: item.firstAttemptAvg, x: bar1X + barWidth / 2, y: y1 })
                }
                onMouseLeave={() => setHoveredBar(null)}
              />
              <rect
                x={bar2X}
                y={y2}
                width={barWidth}
                height={Math.max(3, h2)}
                rx="3"
                ry="3"
                fill="#126BFF"
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setHoveredBar({ lessonName: item.lessonName, type: "Latest Attempt", score: item.latestAttemptAvg, x: bar2X + barWidth / 2, y: y2 })
                }
                onMouseLeave={() => setHoveredBar(null)}
              />
              <text x={groupCenterX} y={height - 10} fill="#0B1F3A" fontSize="12" textAnchor="middle" fontWeight="600">
                {item.lessonName}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredBar && (
        <div
          style={{
            position: "absolute",
            left: `${(hoveredBar.x / width) * 100}%`,
            top: `${(hoveredBar.y / height) * 100 - 45}px`,
            transform: "translateX(-50%)",
            backgroundColor: "#0B1F3A",
            color: "#FFFFFF",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(11, 31, 58, 0.3)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700 }}>{hoveredBar.lessonName}</div>
          <div style={{ color: "#9AAAC1", fontSize: "11px", marginTop: "2px" }}>
            {hoveredBar.type}: <span style={{ color: "#10B981", fontWeight: 700 }}>{hoveredBar.score}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Bar Chart Component for Average Score by Lesson
const RenderLessonAvgBarChart: React.FC<{ dataPoints: LessonScoreItem[] }> = ({ dataPoints }) => {
  const width = 800;
  const height = 210;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;
  const barWidth = Math.min(32, chartW / (dataPoints.length || 1) * 0.45);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ height: "26px", marginBottom: "12px" }} />
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
          const h = (item.avgScore / 100) * chartH;
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

const TeacherClassPerformancePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTerm, setSelectedTerm] = useState("All Terms");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedTimeRange, setSelectedTimeRange] = useState("Last 3 Months");

  const [termsList, setTermsList] = useState<string[]>(["All Terms"]);
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  const [lessonDataPoints, setLessonDataPoints] = useState<LessonScoreItem[]>([]);
  const [topImprovingStudents, setTopImprovingStudents] = useState<StudentSummaryItem[]>([]);
  const [strugglingStudents, setStrugglingStudents] = useState<StudentSummaryItem[]>([]);

  const [classAvg, setClassAvg] = useState<number>(0);
  const [passRate, setPassRate] = useState<number>(0);
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState<number>(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState<number>(0);
  const [atRiskCount, setAtRiskCount] = useState<number>(0);

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedTerm, selectedClass, selectedTimeRange]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const headers = { Authorization: `Token ${token}` };

      const [termsRes, classesRes, lessonsRes, attemptsRes, riskRes, studentsRes] = await Promise.allSettled([
        fetch("/api/quizzes/terms/", { headers }),
        fetch("/api/classes/classrooms/", { headers }),
        fetch("/api/quizzes/lessons/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/analytics/risk/", { headers }),
        fetch("/api/classes/students/", { headers }),
      ]);

      if (termsRes.status === "fulfilled" && termsRes.value.ok) {
        const termsJson = await termsRes.value.json();
        const tArr = Array.isArray(termsJson) ? termsJson : termsJson.results || [];
        const tNames = tArr.map((t: any) => t.name).filter(Boolean);
        setTermsList(["All Terms", ...Array.from(new Set<string>(tNames))]);
      }

      let classes: any[] = [];
      if (classesRes.status === "fulfilled" && classesRes.value.ok) {
        const cJson = await classesRes.value.json();
        classes = Array.isArray(cJson) ? cJson : cJson.results || [];
        setClassList(classes.map((c: any) => ({ id: String(c.id), name: c.name || c.grade_class })));
      }

      let lessons: any[] = [];
      if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
        const lJson = await lessonsRes.value.json();
        lessons = Array.isArray(lJson) ? lJson : lJson.results || [];
      }
      setTotalLessonsCount(lessons.length);

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }

      let riskRecords: any[] = [];
      if (riskRes.status === "fulfilled" && riskRes.value.ok) {
        const rJson = await riskRes.value.json();
        riskRecords = Array.isArray(rJson) ? rJson : rJson.results || [];
      }

      let students: any[] = [];
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const sJson = await studentsRes.value.json();
        students = Array.isArray(sJson) ? sJson : sJson.results || [];
      }

      const highRiskIds = new Set(
        riskRecords
          .filter((r: any) => {
            const cat = (r.risk_category || "").toString().toUpperCase();
            return cat.includes("HIGH") && !cat.includes("NOT HIGH");
          })
          .map((r: any) => r.student || r.student_id)
      );
      setAtRiskCount(highRiskIds.size);

      // Filter attempts by submitted / expired
      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

      if (validAttempts.length > 0) {
        const totalScore = validAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
        setClassAvg(Math.round(totalScore / validAttempts.length));

        const passed = validAttempts.filter((a) => (a.score || 0) >= 60).length;
        setPassRate(Math.round((passed / validAttempts.length) * 100));
      } else {
        setClassAvg(0);
        setPassRate(0);
      }

      // Lessons completed count
      const attemptedLessonIds = new Set(validAttempts.map((a) => a.quiz_lesson_id || a.quiz?.lesson?.id || a.quiz?.lesson));
      setLessonsCompletedCount(attemptedLessonIds.size);

      // Map lesson score items
      const lessonPoints: LessonScoreItem[] = lessons.map((l: any) => {
        const lAtts = validAttempts.filter((a) => {
          const lId = a.quiz_lesson_id || a.quiz?.lesson?.id || a.quiz?.lesson;
          return String(lId) === String(l.id);
        });

        if (lAtts.length === 0) {
          return { lessonName: l.title, avgScore: 0, firstAttemptAvg: 0, latestAttemptAvg: 0 };
        }

        const avgScore = Math.round(lAtts.reduce((acc, a) => acc + (a.score || 0), 0) / lAtts.length);

        const studentAttemptMap = new Map<number, any[]>();
        lAtts.forEach((a) => {
          const sId = a.student || a.student_id;
          if (!studentAttemptMap.has(sId)) studentAttemptMap.set(sId, []);
          studentAttemptMap.get(sId)!.push(a);
        });

        let firstSum = 0;
        let latestSum = 0;
        let sCount = 0;

        studentAttemptMap.forEach((sAtts) => {
          sAtts.sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());
          firstSum += sAtts[0].score || 0;
          latestSum += sAtts[sAtts.length - 1].score || 0;
          sCount += 1;
        });

        return {
          lessonName: l.title,
          avgScore,
          firstAttemptAvg: sCount > 0 ? Math.round(firstSum / sCount) : 0,
          latestAttemptAvg: sCount > 0 ? Math.round(latestSum / sCount) : 0,
        };
      });

      setLessonDataPoints(lessonPoints.filter((lp) => lp.avgScore > 0 || lp.firstAttemptAvg > 0));

      // Compute student performance summary
      const studentSummaries: StudentSummaryItem[] = students.map((s: any) => {
        const sAtts = validAttempts.filter((a) => (a.student || a.student_id) === s.id);
        sAtts.sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());

        const firstScore = sAtts.length > 0 ? sAtts[0].score || 0 : 0;
        const latestScore = sAtts.length > 0 ? sAtts[sAtts.length - 1].score || 0 : 0;
        const imp = sAtts.length > 1 ? latestScore - firstScore : 0;

        const isHighRisk = highRiskIds.has(s.id);
        return {
          id: s.id,
          name: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || `Student #${s.id}`,
          improvementPct: Math.max(0, Math.round(imp)),
          latestScore: Math.round(latestScore),
          riskLevel: isHighRisk ? "High Risk" : "Not High Risk",
          className: s.grade_class || s.student_class || "Class",
        };
      });

      const improving = [...studentSummaries]
        .filter((s) => s.improvementPct > 0)
        .sort((a, b) => b.improvementPct - a.improvementPct);
      setTopImprovingStudents(improving.slice(0, 5));

      const struggling = [...studentSummaries]
        .filter((s) => s.riskLevel === "High Risk" || s.latestScore < 60)
        .sort((a, b) => a.latestScore - b.latestScore);
      setStrugglingStudents(struggling.slice(0, 5));

    } catch (err) {
      console.error("Failed to fetch class performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
          Class Performance
        </h1>
        <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
          Get an overview of your class’s academic performance.
        </p>
      </div>

      {/* FILTER ROW */}
      <div className="teacher-card" style={{ padding: "16px 28px", marginBottom: "20px", display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Time Range:</label>
          <select value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="All Time">All Time</option>
          </select>
        </div>

        {(selectedTerm !== "All Terms" || selectedClass !== "All Classes" || selectedTimeRange !== "Last 3 Months") && (
          <button
            type="button"
            onClick={() => {
              setSelectedTerm("All Terms");
              setSelectedClass("All Classes");
              setSelectedTimeRange("Last 3 Months");
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
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Class Average</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{classAvg}%</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Pass Rate</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{passRate}%</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Lessons Completed</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{lessonsCompletedCount} / {totalLessonsCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>At-Risk Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{String(atRiskCount).padStart(2, "0")}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* MAIN CHARTS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* CHART 1: Average Score by Lesson */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Average Score by Lesson</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>Class-wide average performance per lesson.</p>
          </div>
          <RenderLessonAvgBarChart dataPoints={lessonDataPoints} />
        </div>

        {/* CHART 2: First vs Latest Attempt */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>First vs Latest Attempt</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>Class-level average improvement for each lesson.</p>
          </div>
          <RenderFirstVsLatestChart dataPoints={lessonDataPoints} />
        </div>
      </div>

      {/* BELOW CHARTS: TOP IMPROVING & NEEDING ATTENTION TABLES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
        {/* Top Improving Students Table */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Top Improving Students</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Students showing highest percentage gain.</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Student</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Improvement</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Latest Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {topImprovingStudents.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                  <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{s.name}</td>
                  <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#059669" }}>+{s.improvementPct}%</td>
                  <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{s.latestScore}%</td>
                  <td style={{ padding: "14px 12px", textAlign: "right" }}>
                    <button type="button" onClick={() => navigate(`/teacher/students/${s.id}`)} style={{ border: "none", background: "none", cursor: "pointer", color: "#126BFF" }}>
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Students Needing Attention Table */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Students Needing Attention</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Students identified with high academic risk.</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Student</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Risk Level</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Latest Score</th>
                <th style={{ padding: "12px", fontSize: "14px", color: "#5D78A3", fontWeight: 600, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {strugglingStudents.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                  <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{s.name}</td>
                  <td style={{ padding: "14px 12px" }}>
                    <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5" }}>
                      High Risk
                    </span>
                  </td>
                  <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{s.latestScore}%</td>
                  <td style={{ padding: "14px 12px", textAlign: "right" }}>
                    <button type="button" onClick={() => navigate(`/teacher/students/${s.id}`)} style={{ border: "none", background: "none", cursor: "pointer", color: "#126BFF" }}>
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherClassPerformancePage;
