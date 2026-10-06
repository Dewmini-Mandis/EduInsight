import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

interface StudentRecord {
  id: number;
  name: string;
  className: string;
  avgScore: number;
  latestScore: number;
  progressPct: number;
  riskLevel: "High Risk" | "Not High Risk";
}

const TeacherStudentInsightsPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("All Terms");
  const [selectedClass, setSelectedClass] = useState("All Classes");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchStudentInsights();
  }, []);

  const fetchStudentInsights = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = token ? { Authorization: `Token ${token}` } : {};

      const [studentsRes, riskRes, attemptsRes] = await Promise.allSettled([
        fetch("/api/classes/students/", { headers }),
        fetch("/api/analytics/risk/", { headers }),
        fetch("/api/attempts/attempts/", { headers }),
      ]);

      let rawStudents: any[] = [];
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const json = await studentsRes.value.json();
        rawStudents = Array.isArray(json) ? json : json.results || [];
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

      let attempts: any[] = [];
      if (attemptsRes.status === "fulfilled" && attemptsRes.value.ok) {
        const aJson = await attemptsRes.value.json();
        attempts = Array.isArray(aJson) ? aJson : aJson.results || [];
      }
      const validAttempts = attempts.filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED");

      const mapped: StudentRecord[] = rawStudents.map((s, idx) => {
        const sId = s.id || idx + 1;
        const name = s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || `Student #${sId}`;
        const riskLevelVal: "High Risk" | "Not High Risk" = (riskMap.get(sId) as "High Risk" | "Not High Risk") || "Not High Risk";

        const sAtts = validAttempts.filter((a: any) => (a.student || a.student_id) === sId);
        sAtts.sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());

        const avgScore = sAtts.length > 0 ? Math.round(sAtts.reduce((acc, a) => acc + (a.score || 0), 0) / sAtts.length) : (s.average_score ?? 0);
        const latestScore = sAtts.length > 0 ? Math.round(sAtts[sAtts.length - 1].score || 0) : (s.latest_score ?? 0);
        const passedCount = sAtts.filter((a) => (a.score || 0) >= 60).length;
        const progressPct = sAtts.length > 0 ? Math.round((passedCount / sAtts.length) * 100) : 0;

        return {
          id: sId,
          name,
          className: s.grade_class || s.student_class || "Class",
          avgScore,
          latestScore,
          progressPct,
          riskLevel: riskLevelVal,
        };
      });

      setStudents(mapped);
    } catch (err) {
      console.error("Failed to fetch student insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== "All Classes" && s.className !== selectedClass) return false;
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [students, selectedClass, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const summaryMetrics = useMemo(() => {
    const total = students.length;
    const atRisk = students.filter((s) => s.riskLevel === "High Risk").length;
    const needSupport = students.filter((s) => s.avgScore >= 55 && s.avgScore < 70).length;
    const onTrack = total - atRisk - needSupport;

    return { total, onTrack: Math.max(0, onTrack), needSupport, atRisk };
  }, [students]);

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
          Student Insights
        </h1>
        <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
          View individual student performance and identify learning needs.
        </p>
      </div>

      {/* FILTER ROW */}
      <div className="teacher-card" style={{ padding: "16px 28px", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
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

          {(selectedTerm !== "All Terms" || selectedClass !== "All Classes" || searchTerm.trim() !== "") && (
            <button
              type="button"
              onClick={() => {
                setSelectedTerm("All Terms");
                setSelectedClass("All Classes");
                setSearchTerm("");
                setCurrentPage(1);
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

        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", minWidth: "260px" }}>
          <Search size={18} color="#5D78A3" style={{ position: "absolute", left: "12px" }} />
          <input
            type="text"
            placeholder="Search student name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: "100%", padding: "8px 14px 8px 38px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none" }}
          />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Total Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{summaryMetrics.total}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>On Track</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{summaryMetrics.onTrack}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>Need Support</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{summaryMetrics.needSupport}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#5D78A3", marginBottom: "6px" }}>At Risk</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{summaryMetrics.atRisk}</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* MAIN SECTION: STUDENT PERFORMANCE OVERVIEW TABLE */}
      <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Student Performance Overview</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>Individual performance indicators and ML risk classifications.</p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>Loading student insights...</div>
        ) : paginatedStudents.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>No students match your filter criteria.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Student</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Latest Score</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600, width: "180px" }}>Progress</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Risk Level</th>
                  <th style={{ padding: "14px 16px", fontSize: "14px", color: "#5D78A3", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{s.name}</div>
                      <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>{s.className}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{s.avgScore}%</td>
                    <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{s.latestScore}%</td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0B1F3A" }}>{s.progressPct}%</span>
                        <div style={{ flex: 1, height: "6px", backgroundColor: "#E7EEF7", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${s.progressPct}%`, backgroundColor: "#126BFF", borderRadius: "3px" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {s.riskLevel === "High Risk" ? (
                        <span style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5" }}>
                          High Risk
                        </span>
                      ) : (
                        <span style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                          Not High Risk
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <button type="button" onClick={() => navigate(`/teacher/students/${s.id}`)} style={{ border: "none", background: "none", cursor: "pointer", color: "#126BFF" }} title="View Student Profile">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
            <span style={{ fontSize: "14px", color: "#5D78A3" }}>
              Showing Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentInsightsPage;
