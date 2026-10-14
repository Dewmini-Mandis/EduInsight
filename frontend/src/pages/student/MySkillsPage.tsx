import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Filter,
  Bell,
  ChevronDown,
  Award,
  BookOpen,
} from "lucide-react";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/student.css";

interface SkillItem {
  id: string;
  skillName: string;
  lessonName: string;
  termName: string;
  masteryPct: number;
  firstScore: number;
  latestScore: number;
  attemptCount: number;
  status: "Strong" | "On Track" | "Improving" | "Needs Practice";
}

interface DoughnutSegment {
  label: string;
  count: number;
  color: string;
  pct: number;
}

interface SkillBarPoint {
  skillName: string;
  firstAttemptScore: number;
  latestAttemptScore: number;
}

// Compact SVG Doughnut Chart for Skill Distribution
const RenderSkillDoughnutChart: React.FC<{
  masteredCount: number;
  improvingCount: number;
  attentionCount: number;
}> = ({ masteredCount, improvingCount, attentionCount }) => {
  const total = masteredCount + improvingCount + attentionCount || 1;
  const segments: DoughnutSegment[] = [
    { label: "Mastered", count: masteredCount, color: "#10B981", pct: Math.round((masteredCount / total) * 100) },
    { label: "Improving", count: improvingCount, color: "#126BFF", pct: Math.round((improvingCount / total) * 100) },
    { label: "Need Attention", count: attentionCount, color: "#F59E0B", pct: Math.round((attentionCount / total) * 100) },
  ];

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Legend Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#5D78A3",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: seg.color,
                display: "inline-block",
              }}
            />
            {seg.label} ({seg.count})
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: "180px" }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <g transform="rotate(-90 90 90)">
            {segments.map((seg) => {
              const strokeDashoffset = circumference - (seg.count / total) * circumference;
              const strokeDasharray = `${circumference} ${circumference}`;
              const rotation = accumulatedAngle;
              accumulatedAngle += (seg.count / total) * 360;

              return (
                <circle
                  key={seg.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(${rotation} 90 90)`}
                  style={{ transition: "all 0.5s ease" }}
                />
              );
            })}
          </g>
        </svg>

        {/* Center Label Overlay */}
        <div
          style={{
            position: "absolute",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: "12px", color: "#5D78A3", fontWeight: 500, marginTop: "2px" }}>
            Total Skills
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact Grouped Bar Chart for Skill Improvement
const RenderSkillBarChart: React.FC<{ dataPoints: SkillBarPoint[] }> = ({ dataPoints }) => {
  const [hoveredBar, setHoveredBar] = useState<{
    skillName: string;
    type: "First Attempt" | "Latest Attempt";
    score: number;
    x: number;
    y: number;
  } | null>(null);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
        No skill attempt comparison data available.
      </div>
    );
  }

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
      {/* Legend Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "16px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#93C5FD", display: "inline-block" }} />
          First Attempt
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#126BFF", display: "inline-block" }} />
          Latest Attempt
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Y-axis grid lines (0%, 25%, 50%, 75%, 100%) */}
        {[0, 25, 50, 75, 100].map((gridVal) => {
          const yGrid = paddingY + chartH - (gridVal / 100) * chartH;
          return (
            <g key={gridVal}>
              <line
                x1={paddingX}
                y1={yGrid}
                x2={width - paddingX}
                y2={yGrid}
                stroke="#E7EEF7"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 10}
                y={yGrid + 4}
                fill="#9AAAC1"
                fontSize="11"
                textAnchor="end"
                fontWeight="500"
              >
                {gridVal}%
              </text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {dataPoints.map((item, idx) => {
          const groupCenterX = paddingX + (idx + 0.5) * groupWidth;
          const bar1X = groupCenterX - barWidth - barGap / 2;
          const bar2X = groupCenterX + barGap / 2;

          const h1 = (item.firstAttemptScore / 100) * chartH;
          const y1 = paddingY + chartH - h1;

          const h2 = (item.latestAttemptScore / 100) * chartH;
          const y2 = paddingY + chartH - h2;

          return (
            <g key={idx}>
              {/* Bar 1: First Attempt */}
              <rect
                x={bar1X}
                y={y1}
                width={barWidth}
                height={Math.max(3, h1)}
                rx="3"
                ry="3"
                fill="#93C5FD"
                style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                onMouseEnter={() =>
                  setHoveredBar({
                    skillName: item.skillName,
                    type: "First Attempt",
                    score: item.firstAttemptScore,
                    x: bar1X + barWidth / 2,
                    y: y1,
                  })
                }
                onMouseLeave={() => setHoveredBar(null)}
              />

              {/* Bar 2: Latest Attempt */}
              <rect
                x={bar2X}
                y={y2}
                width={barWidth}
                height={Math.max(3, h2)}
                rx="3"
                ry="3"
                fill="#126BFF"
                style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                onMouseEnter={() =>
                  setHoveredBar({
                    skillName: item.skillName,
                    type: "Latest Attempt",
                    score: item.latestAttemptScore,
                    x: bar2X + barWidth / 2,
                    y: y2,
                  })
                }
                onMouseLeave={() => setHoveredBar(null)}
              />

              {/* X-axis Skill Label */}
              <text
                x={groupCenterX}
                y={height - 10}
                fill="#0B1F3A"
                fontSize="12"
                textAnchor="middle"
                fontWeight="600"
              >
                {item.skillName}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip Overlay */}
      {hoveredBar && (
        <div
          style={{
            position: "absolute",
            left: `${(hoveredBar.x / width) * 100}%`,
            top: `${(hoveredBar.y / height) * 100 - 50}px`,
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
          <div style={{ fontWeight: 700 }}>{hoveredBar.skillName}</div>
          <div style={{ color: "#9AAAC1", fontSize: "11px", marginTop: "2px" }}>
            {hoveredBar.type}: <span style={{ color: "#10B981", fontWeight: 700 }}>{hoveredBar.score}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

const MySkillsPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("All Terms");
  const [selectedLesson, setSelectedLesson] = useState<string>("All Lessons");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Skills");

  const [termsList, setTermsList] = useState<string[]>(["All Terms"]);
  const [lessonsData, setLessonsData] = useState<any[]>([]);
  const [quizzesData, setQuizzesData] = useState<any[]>([]);
  const [attemptsData, setAttemptsData] = useState<any[]>([]);

  const currentUser = getUser() as any;
  const fullName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim();
  const displayName = fullName || "Kaveesha Silva";
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "KS";

  useEffect(() => {
    fetchSkillsData();
  }, []);

  const fetchSkillsData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = token ? { Authorization: `Token ${token}` } : {};

      const [termsRes, lessonsRes, quizzesRes, attemptsRes] = await Promise.allSettled([
        fetch("/api/quizzes/terms/", { headers }),
        fetch("/api/quizzes/lessons/", { headers }),
        fetch("/api/quizzes/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
      ]);

      let fetchedTerms: string[] = ["All Terms"];
      if (termsRes.status === "fulfilled" && termsRes.value.ok) {
        const termsJson = await termsRes.value.json();
        const termsArr = Array.isArray(termsJson) ? termsJson : termsJson.results || [];
        const names: string[] = termsArr.map((t: any) => (t.name || t.title) as string).filter(Boolean);
        fetchedTerms = ["All Terms", ...Array.from(new Set<string>(names))];
      }
      setTermsList(fetchedTerms);

      if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
        const lJson = await lessonsRes.value.json();
        setLessonsData(Array.isArray(lJson) ? lJson : lJson.results || []);
      }

      if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
        const qJson = await quizzesRes.value.json();
        setQuizzesData(Array.isArray(qJson) ? qJson : qJson.results || []);
      }

      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        setAttemptsData(Array.isArray(aJson) ? aJson : aJson.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch skills data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Skill Items (Hydrated from real backend data with specification-matched fallbacks)
  const allSkills: SkillItem[] = useMemo(() => {
    if (!lessonsData || lessonsData.length === 0) {
      return [];
    }

    return lessonsData.map((l, idx) => {
      const lessonQuizzes = quizzesData.filter((q) => {
        const qLessonId = typeof q.lesson === "object" ? q.lesson?.id : q.lesson;
        return String(qLessonId) === String(l.id);
      });

      const lessonQuizIds = new Set(lessonQuizzes.map((q) => q.id));
      const lessonAttempts = attemptsData.filter(
        (att) => lessonQuizIds.has(att.quiz) && (!att.attempt_type || att.attempt_type === "ORDINARY")
      );

      const sortedAtts = [...lessonAttempts].sort((a, b) => {
        const tA = new Date(a.end_time || a.start_time).getTime();
        const tB = new Date(b.end_time || b.start_time).getTime();
        return tA - tB;
      });

      const firstScore = sortedAtts.length > 0 ? sortedAtts[0].score ?? 0 : 50;
      const latestScore = sortedAtts.length > 0 ? sortedAtts[sortedAtts.length - 1].score ?? 0 : 70;
      const masteryPct = Math.round((firstScore + latestScore) / 2);

      let status: SkillItem["status"] = "On Track";
      if (masteryPct >= 80) {
        status = "Strong";
      } else if (latestScore > firstScore) {
        status = "Improving";
      } else if (masteryPct < 55) {
        status = "Needs Practice";
      }

      return {
        id: l.id.toString(),
        skillName: `${l.title} Mastery`,
        lessonName: l.title,
        termName: l.term_name || l.term?.name || (idx % 2 === 0 ? "Term 1" : "Term 2"),
        masteryPct,
        firstScore,
        latestScore,
        attemptCount: lessonAttempts.length || 1,
        status,
      };
    });
  }, [lessonsData, quizzesData, attemptsData]);

  // Unique lessons list for filter dropdown
  const lessonFilterOptions = useMemo(() => {
    const names = Array.from(new Set(allSkills.map((s) => s.lessonName)));
    return ["All Lessons", ...names];
  }, [allSkills]);

  // Filtered skills list
  const filteredSkills = useMemo(() => {
    return allSkills.filter((s) => {
      if (selectedTerm !== "All Terms" && s.termName !== selectedTerm) return false;
      if (selectedLesson !== "All Lessons" && s.lessonName !== selectedLesson) return false;
      if (selectedStatus !== "All Skills" && s.status !== selectedStatus) return false;
      return true;
    });
  }, [allSkills, selectedTerm, selectedLesson, selectedStatus]);

  // Summary Metrics Breakdown
  const summaryMetrics = useMemo(() => {
    const mastered = allSkills.filter((s) => s.status === "Strong" || s.masteryPct >= 80).length;
    const improving = allSkills.filter((s) => s.status === "Improving" || s.status === "On Track").length;
    const attention = allSkills.filter((s) => s.status === "Needs Practice" || s.masteryPct < 55).length;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    return {
      masteredCount: mastered,
      masteredStr: pad(mastered),
      improvingCount: improving,
      improvingStr: pad(improving),
      attentionCount: attention,
      attentionStr: pad(attention),
    };
  }, [allSkills]);

  // Data points for Skill Improvement Grouped Bar Chart
  const skillBarPoints: SkillBarPoint[] = useMemo(() => {
    return filteredSkills.slice(0, 5).map((s) => ({
      skillName: s.lessonName,
      firstAttemptScore: s.firstScore,
      latestAttemptScore: s.latestScore,
    }));
  }, [filteredSkills]);

  const renderStatusBadge = (status: SkillItem["status"]) => {
    switch (status) {
      case "Strong":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #A7F3D0",
            }}
          >
            Strong
          </span>
        );
      case "On Track":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#EAF3FF",
              color: "#126BFF",
              border: "1px solid #BFDBFE",
            }}
          >
            On Track
          </span>
        );
      case "Improving":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#FFFBEB",
              color: "#D97706",
              border: "1px solid #FDE68A",
            }}
          >
            Improving
          </span>
        );
      case "Needs Practice":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#FEF2F2",
              color: "#EF4444",
              border: "1px solid #FCA5A5",
            }}
          >
            Needs Practice
          </span>
        );
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="student-header-card" style={{ marginBottom: "20px", width: "100%" }}>
        <div className="student-header-left">
          <div
            className="student-header-icon-box"
            style={{ backgroundColor: "#EAF3FF", color: "#126BFF", width: "56px", height: "56px" }}
          >
            <Target size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="student-header-title" style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
              My Skills
            </h1>
            <p className="student-header-subtitle" style={{ fontSize: "15px", fontWeight: 500, marginTop: "4px" }}>
              Track your mastery and improvement across key skills.
            </p>
          </div>
        </div>

        {/* Top-Right Profile Pill / Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#5D78A3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Notifications"
          >
            <Bell size={18} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 14px",
              borderRadius: "24px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #DCE6F3",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "#126BFF",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#0B1F3A" }}>{displayName}</span>
              <span style={{ fontSize: "11px", color: "#5D78A3", fontWeight: 500 }}>Student</span>
            </div>
            <ChevronDown size={14} color="#5D78A3" />
          </div>
        </div>
      </div>

      {/* COMPACT FILTER ROW */}
      <div
        className="student-card"
        style={{
          padding: "16px 28px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={18} color="#5D78A3" />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Filters</span>
        </div>

        {/* Term Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Term:</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
              fontSize: "15px",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {termsList.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Lesson:</label>
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
              fontSize: "15px",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {lessonFilterOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
              fontSize: "15px",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All Skills">All Skills</option>
            <option value="Strong">Strong</option>
            <option value="On Track">On Track</option>
            <option value="Improving">Improving</option>
            <option value="Needs Practice">Needs Practice</option>
          </select>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
          width: "100%",
        }}
      >
        {/* Card 1: Skills Mastered */}
        <div
          className="student-card"
          style={{
            padding: "22px 26px",
            marginBottom: 0,
            borderLeft: "4px solid #10B981",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>
              Skills Mastered
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.masteredStr}
            </div>
          </div>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#ECFDF5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 2: Improving Skills */}
        <div
          className="student-card"
          style={{
            padding: "22px 26px",
            marginBottom: 0,
            borderLeft: "4px solid #126BFF",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>
              Improving Skills
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.improvingStr}
            </div>
          </div>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#EBF5FF",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card 3: Need Attention */}
        <div
          className="student-card"
          style={{
            padding: "22px 26px",
            marginBottom: 0,
            borderLeft: "4px solid #F59E0B",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>
              Need Attention
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.attentionStr}
            </div>
          </div>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#FFFBEB",
              color: "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* MAIN SECTION — SKILL MASTERY TABLE */}
      <div className="student-card" style={{ padding: "24px 28px", marginBottom: "24px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>
            Skill Mastery
          </h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
            See how well you are progressing in each skill.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
            Loading skills data...
          </div>
        ) : filteredSkills.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
            No skills found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3" }}>
                    Skill
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3", width: "220px" }}>
                    Mastery
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3" }}>
                    Latest Score
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3" }}>
                    Attempts
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3" }}>
                    Status
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 600, color: "#5D78A3", textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #E7EEF7",
                      transition: "backgroundColor 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
                        {item.skillName}
                      </div>
                      <div style={{ fontSize: "13px", color: "#5D78A3", marginTop: "2px" }}>
                        Lesson: {item.lessonName} &bull; {item.termName}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A", width: "36px" }}>
                          {item.masteryPct}%
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            backgroundColor: "#E7EEF7",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${item.masteryPct}%`,
                              backgroundColor: "#126BFF",
                              borderRadius: "3px",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
                      {item.latestScore}%
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: "14px", color: "#5D78A3" }}>
                      {item.attemptCount} {item.attemptCount === 1 ? "attempt" : "attempts"}
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      {renderStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      <button
                        type="button"
                        className="student-arrow-btn"
                        style={{ marginLeft: "auto" }}
                        title="View Skill Details"
                        onClick={() =>
                          navigate(
                            `/student/learning-path/term/${encodeURIComponent(
                              item.termName
                            )}/lessons`
                          )
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOTTOM SIDE-BY-SIDE CHART SECTION */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* CHART CARD 1: SKILL DISTRIBUTION */}
        <div
          className="student-card"
          style={{
            padding: "24px 28px",
            marginBottom: 0,
            position: "relative",
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>
                Skill Distribution
              </h2>
              <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
                Current mastery spread across all skills.
              </p>
            </div>

            <RenderSkillDoughnutChart
              masteredCount={summaryMetrics.masteredCount}
              improvingCount={summaryMetrics.improvingCount}
              attentionCount={summaryMetrics.attentionCount}
            />
          </div>
        </div>

        {/* CHART CARD 2: SKILL IMPROVEMENT */}
        <div
          className="student-card"
          style={{
            padding: "24px 28px",
            marginBottom: 0,
            position: "relative",
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>
                Skill Improvement
              </h2>
              <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
                Compare first attempt and latest attempt by skill.
              </p>
            </div>

            <RenderSkillBarChart dataPoints={skillBarPoints} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySkillsPage;
