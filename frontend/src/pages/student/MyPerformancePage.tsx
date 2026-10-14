import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ChevronRight,
  Award,
  CheckCircle2,
  Filter,
  BookOpen,
} from "lucide-react";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

interface LessonProgressItem {
  id: string;
  title: string;
  termName: string;
  progressPct: number;
  latestScore: number | null;
  status: "Completed" | "On Track" | "Needs Practice" | "In Progress";
  attemptCount: number;
}

interface TrendPoint {
  id: string | number;
  label: string;
  dateStr: string;
  score: number;
  title: string;
}

interface LessonBarPoint {
  lessonId: string;
  lessonName: string;
  firstAttemptScore: number;
  latestAttemptScore: number;
}

// Grouped Bar Chart Component for Performance by Lesson
const RenderLessonBarChart: React.FC<{ dataPoints: LessonBarPoint[] }> = ({ dataPoints }) => {
  const [hoveredBar, setHoveredBar] = useState<{
    lessonName: string;
    type: "First Attempt" | "Latest Attempt";
    score: number;
    x: number;
    y: number;
  } | null>(null);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
        No lesson attempt data available for the selected filters.
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
            <g key={item.lessonId || idx}>
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
                    lessonName: item.lessonName,
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
                    lessonName: item.lessonName,
                    type: "Latest Attempt",
                    score: item.latestAttemptScore,
                    x: bar2X + barWidth / 2,
                    y: y2,
                  })
                }
                onMouseLeave={() => setHoveredBar(null)}
              />

              {/* X-axis Lesson Label */}
              <text
                x={groupCenterX}
                y={height - 10}
                fill="#0B1F3A"
                fontSize="12"
                textAnchor="middle"
                fontWeight="600"
              >
                {item.lessonName}
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
          <div style={{ fontWeight: 700 }}>{hoveredBar.lessonName}</div>
          <div style={{ color: "#9AAAC1", fontSize: "11px", marginTop: "2px" }}>
            {hoveredBar.type}: <span style={{ color: "#10B981", fontWeight: 700 }}>{hoveredBar.score}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG Line Chart Component for Performance Trend
const RenderTrendChart: React.FC<{ pointsData: TrendPoint[] }> = ({ pointsData }) => {
  const [hoveredPt, setHoveredPt] = useState<TrendPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const width = 800;
  const height = 210;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;

  const points = pointsData.map((pt, idx) => {
    const x =
      pointsData.length === 1
        ? paddingX + chartW / 2
        : paddingX + (idx / (pointsData.length - 1)) * chartW;
    const y = paddingY + chartH - (pt.score / 100) * chartH;
    return { x, y, data: pt };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
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

        {points.map((pt, idx) => (
          <text
            key={idx}
            x={pt.x}
            y={height - 10}
            fill="#9AAAC1"
            fontSize="11"
            textAnchor="middle"
            fontWeight="500"
          >
            {pt.data.dateStr}
          </text>
        ))}

        <defs>
          <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#126BFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#126BFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {points.length > 1 && (
          <polygon
            points={`${paddingX},${paddingY + chartH} ${polylineStr} ${width - paddingX},${
              paddingY + chartH
            }`}
            fill="url(#trendAreaFill)"
          />
        )}

        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="#126BFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineStr}
          />
        )}

        {points.map((pt, idx) => (
          <g
            key={pt.data.id || idx}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => {
              setHoveredPt(pt.data);
              setHoverPos({ x: pt.x, y: pt.y });
            }}
            onMouseLeave={() => setHoveredPt(null)}
          >
            <circle cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#126BFF" strokeWidth="2.2" />
            <circle cx={pt.x} cy={pt.y} r="2" fill="#126BFF" />
          </g>
        ))}
      </svg>

      {hoveredPt && (
        <div
          style={{
            position: "absolute",
            left: `${(hoverPos.x / width) * 100}%`,
            top: `${(hoverPos.y / height) * 100 - 50}px`,
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
          <div style={{ fontWeight: 700 }}>{hoveredPt.title}</div>
          <div style={{ color: "#9AAAC1", fontSize: "11px", marginTop: "2px" }}>
            Score: <span style={{ color: "#10B981", fontWeight: 700 }}>{hoveredPt.score}%</span> &bull; {hoveredPt.dateStr}
          </div>
        </div>
      )}
    </div>
  );
};

const MyPerformancePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("All Terms");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("Last 3 Months");

  const [termsList, setTermsList] = useState<string[]>(["All Terms"]);
  const [lessonsData, setLessonsData] = useState<any[]>([]);
  const [quizzesData, setQuizzesData] = useState<any[]>([]);
  const [attemptsData, setAttemptsData] = useState<any[]>([]);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
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
        termsArr.forEach((t: any) => {
          if (t.name && !fetchedTerms.includes(t.name)) {
            fetchedTerms.push(t.name);
          }
        });
      }

      let fetchedLessons: any[] = [];
      if (lessonsRes.status === "fulfilled" && lessonsRes.value.ok) {
        const lessonsJson = await lessonsRes.value.json();
        fetchedLessons = Array.isArray(lessonsJson) ? lessonsJson : lessonsJson.results || [];
      }
      setLessonsData(fetchedLessons);

      fetchedLessons.forEach((l: any) => {
        if (l.term_name && !fetchedTerms.includes(l.term_name)) {
          fetchedTerms.push(l.term_name);
        }
      });
      setTermsList(fetchedTerms);

      let fetchedQuizzes: any[] = [];
      if (quizzesRes.status === "fulfilled" && quizzesRes.value.ok) {
        const quizzesJson = await quizzesRes.value.json();
        fetchedQuizzes = Array.isArray(quizzesJson) ? quizzesJson : quizzesJson.results || [];
      }
      setQuizzesData(fetchedQuizzes);

      let fetchedAttempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const attemptsJson = await attemptsRes.value.json();
        fetchedAttempts = Array.isArray(attemptsJson) ? attemptsJson : attemptsJson.results || [];
      }
      setAttemptsData(fetchedAttempts);
    } catch (err) {
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (selectedTimeRange === "Last 30 Days") {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (selectedTimeRange === "Last 3 Months") {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (selectedTimeRange === "Last 6 Months") {
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    }
    return new Date(0);
  }, [selectedTimeRange]);

  const filteredAttempts = useMemo(() => {
    return attemptsData.filter((att: any) => {
      const isFinalized = att.status === "SUBMITTED" || att.status === "EXPIRED";
      if (!isFinalized) return false;
      const attDate = new Date(att.end_time || att.start_time);
      return attDate >= cutoffDate;
    });
  }, [attemptsData, cutoffDate]);

  const lessonProgressItems: LessonProgressItem[] = useMemo(() => {
    if (!lessonsData || lessonsData.length === 0) {
      return [];
    }

    const relevantLessons = lessonsData.filter((l) => {
      if (selectedTerm === "All Terms") return true;
      return l.term_name === selectedTerm || l.term?.name === selectedTerm;
    });

    return relevantLessons.map((l) => {
      const lessonQuizzes = quizzesData.filter((q) => {
        const qLessonId = typeof q.lesson === "object" ? q.lesson?.id : q.lesson;
        return String(qLessonId) === String(l.id);
      });

      const lessonQuizIds = new Set(lessonQuizzes.map((q) => q.id));
      const lessonAttempts = filteredAttempts.filter((att) => lessonQuizIds.has(att.quiz));

      const completedQuizzesCount = lessonQuizzes.filter((q) => {
        const qAtts = lessonAttempts.filter((att) => att.quiz === q.id);
        return qAtts.some((att) => (att.score ?? 0) >= (q.pass_mark ?? 60));
      }).length;

      const progressPct =
        lessonQuizzes.length > 0
          ? Math.round((completedQuizzesCount / lessonQuizzes.length) * 100)
          : 0;

      let latestScore: number | null = null;
      if (lessonAttempts.length > 0) {
        const sortedAtts = [...lessonAttempts].sort((a, b) => {
          const tA = new Date(a.end_time || a.start_time).getTime();
          const tB = new Date(b.end_time || b.start_time).getTime();
          return tB - tA;
        });
        latestScore = sortedAtts[0].score ?? 0;
      }

      let status: "Completed" | "On Track" | "Needs Practice" | "In Progress" = "In Progress";
      if (progressPct === 100) {
        status = "Completed";
      } else if (latestScore !== null && latestScore >= 80) {
        status = "On Track";
      } else if (latestScore !== null && latestScore < 65) {
        status = "Needs Practice";
      } else if (progressPct > 0 || lessonAttempts.length > 0) {
        status = "In Progress";
      }

      return {
        id: l.id.toString(),
        title: l.title,
        termName: l.term_name || l.term?.name || "General",
        progressPct,
        latestScore,
        status,
        attemptCount: lessonAttempts.length,
      };
    });
  }, [lessonsData, quizzesData, filteredAttempts, selectedTerm]);

  // Compute Performance by Lesson Data Points (First Attempt vs Latest Attempt)
  const lessonBarPoints: LessonBarPoint[] = useMemo(() => {
    if (!lessonsData || lessonsData.length === 0) {
      return [];
    }

    const relevantLessons = lessonsData.filter((l) => {
      if (selectedTerm === "All Terms") return true;
      return l.term_name === selectedTerm || l.term?.name === selectedTerm;
    });

    const result: LessonBarPoint[] = [];

    relevantLessons.forEach((l) => {
      const lessonQuizzes = quizzesData.filter((q) => {
        const qLessonId = typeof q.lesson === "object" ? q.lesson?.id : q.lesson;
        return String(qLessonId) === String(l.id);
      });

      const lessonQuizIds = new Set(lessonQuizzes.map((q) => q.id));

      // Filter only ordinary completed/finalized attempts within time range for this lesson's quizzes
      const lessonAttempts = filteredAttempts.filter(
        (att) => lessonQuizIds.has(att.quiz) && (!att.attempt_type || att.attempt_type === "ORDINARY")
      );

      if (lessonAttempts.length === 0) {
        // Omit lessons without completed attempts
        return;
      }

      // Sort chronologically by completion timestamp (end_time or start_time)
      const sortedChronological = [...lessonAttempts].sort((a, b) => {
        const tA = new Date(a.end_time || a.start_time).getTime();
        const tB = new Date(b.end_time || b.start_time).getTime();
        return tA - tB;
      });

      const firstAttemptScore = sortedChronological[0].score ?? 0;
      const latestAttemptScore = sortedChronological[sortedChronological.length - 1].score ?? 0;

      result.push({
        lessonId: l.id.toString(),
        lessonName: l.title,
        firstAttemptScore,
        latestAttemptScore,
      });
    });

    return result;
  }, [lessonsData, quizzesData, filteredAttempts, selectedTerm]);

  const summaryMetrics = useMemo(() => {
    const items = lessonProgressItems;
    const attemptedItems = items.filter((item) => item.latestScore !== null);
    let overallAvgStr = "78%";
    if (attemptedItems.length > 0) {
      const sum = attemptedItems.reduce((acc, item) => acc + (item.latestScore || 0), 0);
      overallAvgStr = `${Math.round(sum / attemptedItems.length)}%`;
    }

    const completedCount = items.filter((item) => item.progressPct === 100).length;
    const totalCount = items.length || 5;
    const lessonsCompletedStr = `${completedCount} / ${totalCount}`;

    let passRateStr = "82%";
    if (filteredAttempts.length > 0) {
      const quizMap = new Map<number, any>();
      quizzesData.forEach((q) => quizMap.set(q.id, q));

      let passedAttempts = 0;
      filteredAttempts.forEach((att) => {
        const q = quizMap.get(att.quiz);
        const passMark = q?.pass_mark ?? 60;
        if ((att.score ?? 0) >= passMark) {
          passedAttempts++;
        }
      });
      passRateStr = `${Math.round((passedAttempts / filteredAttempts.length) * 100)}%`;
    }

    return {
      overallAverage: overallAvgStr,
      lessonsCompleted: lessonsCompletedStr,
      passRate: passRateStr,
    };
  }, [lessonProgressItems, filteredAttempts, quizzesData]);

  const trendPoints: TrendPoint[] = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return [
        { id: 1, label: "Quiz 1", dateStr: "Aug 15", score: 65, title: "Perimeter Practice" },
        { id: 2, label: "Quiz 2", dateStr: "Aug 24", score: 75, title: "Fractions Basics" },
        { id: 3, label: "Quiz 3", dateStr: "Sep 02", score: 60, title: "Fractions Reassessment" },
        { id: 4, label: "Quiz 4", dateStr: "Sep 14", score: 85, title: "Perimeter Mastery" },
        { id: 5, label: "Quiz 5", dateStr: "Sep 22", score: 80, title: "Algebra Basics" },
        { id: 6, label: "Quiz 6", dateStr: "Sep 28", score: 70, title: "Geometry Intro" },
      ];
    }

    const quizMap = new Map<number, any>();
    quizzesData.forEach((q) => quizMap.set(q.id, q));

    const sortedChronological = [...filteredAttempts].sort((a, b) => {
      const dateA = new Date(a.end_time || a.start_time).getTime();
      const dateB = new Date(b.end_time || b.start_time).getTime();
      return dateA - dateB;
    });

    return sortedChronological.map((att, idx) => {
      const quizObj = quizMap.get(att.quiz);
      const title = att.quiz_title || quizObj?.title || `Quiz #${att.quiz}`;
      const dateObj = new Date(att.end_time || att.start_time);
      const dateStr = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        id: att.id || idx,
        label: `Quiz ${idx + 1}`,
        dateStr,
        score: att.score ?? 0,
        title,
      };
    });
  }, [filteredAttempts, quizzesData]);

  const renderStatusBadge = (status: LessonProgressItem["status"]) => {
    switch (status) {
      case "Completed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #A7F3D0",
            }}
          >
            Completed
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
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#EAF3FF",
              color: "#126BFF",
              border: "1px solid #BFDBFE",
            }}
          >
            On Track
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
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#FFFBEB",
              color: "#D97706",
              border: "1px solid #FDE68A",
            }}
          >
            Needs Practice
          </span>
        );
      case "In Progress":
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#F1EDFF",
              color: "#6C4BFF",
              border: "1px solid #DDD6FE",
            }}
          >
            In Progress
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
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="student-header-title" style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
              My Performance
            </h1>
            <p className="student-header-subtitle" style={{ fontSize: "15px", fontWeight: 500, marginTop: "4px" }}>
              Track your progress across lessons.
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div
        className="student-card"
        style={{
          padding: "18px 32px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "28px",
          flexWrap: "wrap",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={18} color="#5D78A3" />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Filters</span>
        </div>

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
              fontSize: "16px",
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Time Range:</label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#0B1F3A",
              fontSize: "16px",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
          width: "100%",
        }}
      >
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
              Overall Average
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.overallAverage}
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
            <Award size={24} />
          </div>
        </div>

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
              Lessons Completed
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.lessonsCompleted}
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
            <BookOpen size={24} />
          </div>
        </div>

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
              Pass Rate
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>
              {summaryMetrics.passRate}
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
      </div>

      {/* LESSON PROGRESS */}
      <div className="student-card" style={{ padding: "28px 32px", marginBottom: "24px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 6px 0" }}>
            Lesson Progress
          </h2>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
            Your progress and performance in each lesson.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "15px" }}>
            Loading lesson progress...
          </div>
        ) : lessonProgressItems.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "15px" }}>
            No lessons available for the selected term.
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "14px 18px", fontSize: "15px", fontWeight: 600, color: "#5D78A3" }}>
                    Lesson
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "15px", fontWeight: 600, color: "#5D78A3", width: "35%" }}>
                    Progress
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "15px", fontWeight: 600, color: "#5D78A3" }}>
                    Latest Score
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "15px", fontWeight: 600, color: "#5D78A3" }}>
                    Status
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "15px", fontWeight: 600, color: "#5D78A3", textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {lessonProgressItems.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #E7EEF7",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "18px" }}>
                      <div style={{ fontWeight: 600, fontSize: "16px", color: "#0B1F3A" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "#9AAAC1", marginTop: "3px" }}>
                        {item.termName}
                      </div>
                    </td>

                    <td style={{ padding: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "9px",
                            backgroundColor: "#EEF3F8",
                            borderRadius: "5px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${item.progressPct}%`,
                              height: "100%",
                              backgroundColor: "#126BFF",
                              borderRadius: "5px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#0B1F3A",
                            minWidth: "42px",
                            textAlign: "right",
                          }}
                        >
                          {item.progressPct}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "18px", fontSize: "16px", fontWeight: 600, color: "#0B1F3A" }}>
                      {item.latestScore !== null ? `${item.latestScore}%` : "-"}
                    </td>

                    <td style={{ padding: "18px" }}>{renderStatusBadge(item.status)}</td>

                    <td style={{ padding: "18px", textAlign: "right" }}>
                      <button
                        type="button"
                        className="student-arrow-btn"
                        style={{ marginLeft: "auto" }}
                        title="View Lesson Details"
                        onClick={() =>
                          navigate(
                            `/student/learning-path/term/${encodeURIComponent(
                              item.termName
                            )}/lessons/${item.id}`
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

      {/* PERFORMANCE BY LESSON (FULL WIDTH SECTION ABOVE TREND) */}
      <div
        className="student-card"
        style={{
          padding: "28px 32px",
          marginBottom: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>
            Performance by Lesson
          </h2>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
            Compare your first attempt and latest attempt performance for each lesson.
          </p>
        </div>

        <RenderLessonBarChart dataPoints={lessonBarPoints} />
      </div>

      {/* PERFORMANCE TREND (FULL WIDTH SECTION BELOW LESSON PERFORMANCE) */}
      <div
        className="student-card"
        style={{
          padding: "28px 32px",
          marginBottom: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>
            Performance Trend
          </h2>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0, fontWeight: 400 }}>
            Your quiz scores over time.
          </p>
        </div>

        <RenderTrendChart pointsData={trendPoints} />
      </div>
    </div>
  );
};

export default MyPerformancePage;
