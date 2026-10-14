import React, { useState } from "react";
import "../../../styles/student.css";

interface AttemptDataPoint {
  id: number;
  quizTitle: string;
  attemptNumber: number;
  attemptType?: string;
  score: number;
  dateStr: string;
}

interface ScoreProgressChartProps {
  attempts: AttemptDataPoint[];
}

const ScoreProgressChart: React.FC<ScoreProgressChartProps> = ({ attempts }) => {
  const [hoveredPoint, setHoveredPoint] = useState<AttemptDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!attempts || attempts.length === 0) {
    return (
      <div className="student-card" style={{ padding: "36px", textAlign: "center" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", marginBottom: "6px" }}>
          Score Progress
        </h3>
        <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>
          No finalized ordinary quiz attempts recorded yet. Complete a quiz to view your score trend.
        </p>
      </div>
    );
  }

  // Width & Height for SVG viewbox
  const width = 800;
  const height = 260;
  const paddingX = 50;
  const paddingY = 40;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Points calculation
  const points = attempts.map((att, idx) => {
    const x =
      attempts.length === 1
        ? paddingX + chartW / 2
        : paddingX + (idx / (attempts.length - 1)) * chartW;
    const y = paddingY + chartH - (att.score / 100) * chartH;
    return { x, y, data: att };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="student-card" style={{ padding: "24px 28px", position: "relative" }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
          Score Progress
        </h3>
        <p style={{ fontSize: "13px", color: "#5D78A3", margin: "2px 0 0 0" }}>
          Your performance across completed quiz attempts over time.
        </p>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", minWidth: "500px" }}
        >
          {/* Background Grid Lines (0%, 25%, 50%, 75%, 100%) */}
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
                  fontWeight="600"
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {/* Line Chart Gradient & Area Fill */}
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#126BFF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#126BFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {points.length > 1 && (
            <polygon
              points={`${paddingX},${paddingY + chartH} ${polylineStr} ${width - paddingX},${
                paddingY + chartH
              }`}
              fill="url(#chartFill)"
            />
          )}

          {/* Connecting Line */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#126BFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />
          )}

          {/* Interactive Data Nodes */}
          {points.map((pt, idx) => (
            <g
              key={pt.data.id || idx}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                setHoveredPoint(pt.data);
                setTooltipPos({ x: pt.x, y: pt.y });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle cx={pt.x} cy={pt.y} r="7" fill="#FFFFFF" stroke="#126BFF" strokeWidth="3" />
              <circle cx={pt.x} cy={pt.y} r="3" fill="#126BFF" />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: "absolute",
              left: `${(tooltipPos.x / width) * 100}%`,
              top: `${(tooltipPos.y / height) * 100 - 65}px`,
              transform: "translateX(-50%)",
              background: "#0B1F3A",
              color: "#FFFFFF",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              pointerEvents: "none",
              boxShadow: "0 4px 12px rgba(11, 31, 58, 0.3)",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: "700" }}>{hoveredPoint.quizTitle}</div>
            <div style={{ color: "#9AAAC1", fontSize: "11px", marginTop: "2px" }}>
              Attempt #{hoveredPoint.attemptNumber} {hoveredPoint.attemptType ? `(${hoveredPoint.attemptType})` : ""} &bull;{" "}
              <span style={{ color: "#16B978", fontWeight: "700" }}>{hoveredPoint.score}%</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", marginTop: "2px" }}>
              {hoveredPoint.dateStr}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreProgressChart;
