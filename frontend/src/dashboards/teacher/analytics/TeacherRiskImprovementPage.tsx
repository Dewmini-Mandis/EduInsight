import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface RiskImprovementItem {
  id: number;
  studentName: string;
  className: string;
  beforeScore: number;
  reassessmentScore: number;
  improvementPct: number;
  riskLevel: "High Risk" | "Not High Risk";
}

// Risk Distribution Over Time Line Chart (High Risk vs Not High Risk)
const RenderRiskTrendChart: React.FC = () => {
  const width = 800;
  const height = 210;
  const paddingX = 50;
  const paddingY = 20;
  const bottomPadding = 35;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;

  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];
  const highRiskData = [8, 7, 6, 5, 4, 4];
  const notHighRiskData = [24, 25, 26, 27, 28, 28];

  const highPoints = highRiskData.map((val, idx) => {
    const x = paddingX + (idx / (weeks.length - 1)) * chartW;
    const y = paddingY + chartH - (val / 32) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const notHighPoints = notHighRiskData.map((val, idx) => {
    const x = paddingX + (idx / (weeks.length - 1)) * chartW;
    const y = paddingY + chartH - (val / 32) * chartH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#EF4444" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
          High Risk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#10B981" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981" }} />
          Not High Risk
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 8, 16, 24, 32].map((gridVal) => {
          const yGrid = paddingY + chartH - (gridVal / 32) * chartH;
          return (
            <g key={gridVal}>
              <line x1={paddingX} y1={yGrid} x2={width - paddingX} y2={yGrid} stroke="#E7EEF7" strokeDasharray="4 4" />
              <text x={paddingX - 10} y={yGrid + 4} fill="#9AAAC1" fontSize="11" textAnchor="end" fontWeight="500">
                {gridVal}
              </text>
            </g>
          );
        })}

        {weeks.map((w, idx) => {
          const x = paddingX + (idx / (weeks.length - 1)) * chartW;
          return (
            <text key={idx} x={x} y={height - 10} fill="#9AAAC1" fontSize="11" textAnchor="middle" fontWeight="500">
              {w}
            </text>
          );
        })}

        <polyline fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" points={highPoints} />
        <polyline fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" points={notHighPoints} />
      </svg>
    </div>
  );
};

// Remedial Improvement Outcome Chart (Improved vs No Improvement)
const RenderRemedialOutcomeChart: React.FC<{ improvedCount: number; noImpCount: number }> = ({
  improvedCount,
  noImpCount,
}) => {
  const total = improvedCount + noImpCount || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const segs = [
    { label: "Improved", count: improvedCount, color: "#10B981" },
    { label: "No Improvement", count: noImpCount, color: "#EF4444" },
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
          <div style={{ fontSize: "11px", color: "#5D78A3" }}>Evaluated</div>
        </div>
      </div>
    </div>
  );
};

const TeacherRiskImprovementPage: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState("All Terms");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [loading, setLoading] = useState(true);
  const [improvementItems, setImprovementItems] = useState<RiskImprovementItem[]>([]);

  useEffect(() => {
    fetchRiskImprovementData();
  }, []);

  const fetchRiskImprovementData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = token ? { Authorization: `Token ${token}` } : {};

      const [riskRes, attemptsRes] = await Promise.allSettled([
        fetch("/api/analytics/risk/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
      ]);

      let riskRecords: any[] = [];
      if (riskRes.status === "fulfilled" && riskRes.value.ok) {
        const json = await riskRes.value.json();
        riskRecords = Array.isArray(json) ? json : json.results || [];
      }

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }
      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

      const mapped: RiskImprovementItem[] = riskRecords.map((r, idx) => {
        const cat = (r.risk_category || "").toString().toUpperCase();
        const riskLevel: "High Risk" | "Not High Risk" = cat.includes("HIGH") && !cat.includes("NOT HIGH") ? "High Risk" : "Not High Risk";
        const sId = r.student || r.student_id;

        const sAtts = validAttempts.filter((a: any) => (a.student || a.student_id) === sId);
        sAtts.sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());

        const beforeScore = sAtts.length > 0 ? Math.round(sAtts[0].score || 0) : 0;
        const reassessmentScore = sAtts.length > 1 ? Math.round(sAtts[sAtts.length - 1].score || 0) : beforeScore;
        const improvementPct = Math.max(0, reassessmentScore - beforeScore);

        return {
          id: r.id || idx + 1,
          studentName: r.student_name || r.student?.user?.first_name || `Student #${sId}`,
          className: r.student_class || r.student?.grade_class || "Class",
          beforeScore,
          reassessmentScore,
          improvementPct,
          riskLevel,
        };
      });

      setImprovementItems(mapped);
    } catch (err) {
      console.error("Failed to load risk & improvement data:", err);
    } finally {
      setLoading(false);
    }
  };

  const highRiskCount = useMemo(() => improvementItems.filter((i) => i.riskLevel === "High Risk").length, [improvementItems]);
  const notHighRiskCount = useMemo(() => improvementItems.filter((i) => i.riskLevel === "Not High Risk").length, [improvementItems]);
  const improvedCount = useMemo(() => improvementItems.filter((i) => i.improvementPct > 0).length, [improvementItems]);

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
          Risk & Improvement
        </h1>
        <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
          Monitor at-risk students and track improvement over time.
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
            <option value="All Terms">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "15px", color: "#5D78A3", fontWeight: 600 }}>Class:</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>
            <option value="All Classes">All Classes</option>
            <option value="Grade 10-A">Grade 10-A</option>
            <option value="Grade 10-B">Grade 10-B</option>
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

      {/* SUMMARY CARDS (STRICT BINARY MODEL CATEGORIES) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>High Risk Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{highRiskCount < 10 ? `0${highRiskCount}` : highRiskCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Not High Risk Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{notHighRiskCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Students Improved</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{improvedCount < 10 ? `0${improvedCount}` : improvedCount}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* MAIN CHART SECTION: RISK DISTRIBUTION OVER TIME & REMEDIAL OUTCOME */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Risk Distribution Over Time</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Weekly count of High Risk vs Not High Risk students.</p>
          </div>
          <RenderRiskTrendChart />
        </div>

        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Improvement After Remedial Learning</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Outcome distribution after targeted intervention.</p>
          </div>
          <RenderRemedialOutcomeChart improvedCount={9} noImpCount={1} />
        </div>
      </div>

      {/* SECOND SECTION: STUDENT IMPROVEMENT DETAILS TABLE */}
      <div className="teacher-card" style={{ padding: "24px 28px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Student Improvement Details</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Comparison of initial assessment vs reassessment scores.</p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>Loading improvement data...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Student</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Before Remedial Score</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Reassessment Score</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Improvement</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {improvementItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.studentName}</div>
                      <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>{item.className}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.beforeScore}%</td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{item.reassessmentScore}%</td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#059669" }}>+{item.improvementPct}%</td>
                    <td style={{ padding: "16px" }}>
                      {item.riskLevel === "High Risk" ? (
                        <span style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5" }}>
                          High Risk
                        </span>
                      ) : (
                        <span style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                          Not High Risk
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherRiskImprovementPage;
