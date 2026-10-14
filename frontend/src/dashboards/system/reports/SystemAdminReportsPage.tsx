import React, { useEffect, useState, useMemo } from "react";
import {
  Download,
  Users,
  BookOpen,
  School as SchoolIcon,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  BarChart2,
  PieChart,
} from "lucide-react";
import { getToken } from "../../../auth/authUtils";

import { generateReportPdf } from "./pdf/reportPdfGenerator";

// Interfaces
interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  is_active: boolean;
  school_id?: number | null;
  student_profile?: {
    id?: number;
    index_no?: string;
    grade?: string;
    class_id?: number | null;
    class_name?: string;
    assigned_teacher_id?: number | null;
    assigned_teacher_name?: string;
    assigned_teacher_email?: string;
  } | null;
  teacher_profile?: {
    subjects?: string[];
  } | null;
}

interface ClassItem {
  id: number;
  name: string;
  is_active?: boolean;
  teachers?: {
    id: number;
    teacher: number;
    teacher_name?: string;
    is_active?: boolean;
  }[];
  school?: number | null;
}

interface LessonItem {
  id: number;
  title: string;
  term?: number | null;
  term_name?: string;
  skills_count?: number;
}

interface TermItem {
  id: number;
  name: string;
}

// Compact SVG Bar Chart component for Lessons by Term / Students by Class
const RenderBarChart: React.FC<{ data: { label: string; value: number }[]; color?: string }> = ({
  data,
  color = "#126BFF",
}) => {
  if (!data || data.length === 0) {
    return <div style={{ fontSize: "13px", color: "#5D78A3", textAlign: "center", padding: "20px" }}>No data available</div>;
  }

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;
  const bottomPadding = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY - bottomPadding;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const barWidth = Math.min(36, (chartW / data.length) * 0.5);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, maxVal * 0.5, maxVal].map((val, idx) => {
          const yGrid = paddingY + chartH - (val / maxVal) * chartH;
          return (
            <g key={idx}>
              <line x1={paddingX} y1={yGrid} x2={width - paddingX} y2={yGrid} stroke="#E7EEF7" strokeDasharray="4 4" />
              <text x={paddingX - 8} y={yGrid + 4} fill="#9AAAC1" fontSize="11" textAnchor="end" fontWeight="500">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const cx = paddingX + ((idx + 0.5) / data.length) * chartW;
          const x = cx - barWidth / 2;
          const h = (item.value / maxVal) * chartH;
          const y = paddingY + chartH - h;

          return (
            <g key={idx}>
              <rect x={x} y={y} width={barWidth} height={Math.max(4, h)} rx="4" ry="4" fill={color} />
              <text x={cx} y={height - 8} fill="#0B1F3A" fontSize="11" textAnchor="middle" fontWeight="600">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Compact Doughnut Chart component for User Distribution
const RenderDoughnutChart: React.FC<{ items: { label: string; count: number; color: string }[] }> = ({ items }) => {
  const total = items.reduce((acc, i) => acc + i.count, 0) || 1;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
        {items.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color }} />
            {s.label} ({s.count})
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: "150px" }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <g transform="rotate(-90 75 75)">
            {items.map((seg) => {
              const dashOffset = circumference - (seg.count / total) * circumference;
              const rotation = accumulatedAngle;
              accumulatedAngle += (seg.count / total) * 360;

              return (
                <circle
                  key={seg.label}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(${rotation} 75 75)`}
                />
              );
            })}
          </g>
        </svg>
        <div style={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A" }}>{total}</div>
          <div style={{ fontSize: "11px", color: "#5D78A3" }}>Total Users</div>
        </div>
      </div>
    </div>
  );
};

const SystemAdminReportsPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filters
  const [selectedReport, setSelectedReport] = useState<"teacher" | "student" | "class" | "lesson" | "system">("teacher");
  const [filterTerm, setFilterTerm] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, classesRes, lessonsRes, termsRes] = await Promise.all([
        fetch("/api/accounts/users/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/classes/classrooms/?page_size=1000&teacher_assigned_only=true", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/lessons/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/terms/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : data.results || []);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(Array.isArray(data) ? data : data.results || []);
      }
      if (lessonsRes.ok) {
        const data = await lessonsRes.json();
        setLessons(Array.isArray(data) ? data : data.results || []);
      }
      if (termsRes.ok) {
        const data = await termsRes.json();
        setTerms(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error("Failed to load report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadReport = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await generateReportPdf(
        { selectedReport, filterTerm, filterClass, filterStatus, searchTerm },
        { users, classes, lessons, terms }
      );
    } catch (err) {
      console.error("Unable to generate report PDF", err);
      alert("Unable to generate the report PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Active (non-deleted) classes with assigned teachers only
  const activeClasses = useMemo(() => {
    return classes.filter(
      (c) => c.is_active !== false && Array.isArray(c.teachers) && c.teachers.some((t) => t.is_active !== false)
    );
  }, [classes]);

  // Filtered Teacher Data
  const teachers = useMemo(() => {
    return users.filter((u) => {
      const r = typeof u.role === "string" ? u.role : (u.role as any)?.role_name || "";
      return r.toUpperCase() === "TEACHER" || r.toUpperCase() === "ROLE_TEACHER";
    });
  }, [users]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (filterStatus === "Active" && !t.is_active) return false;
      if (filterStatus === "Inactive" && t.is_active) return false;
      if (searchTerm) {
        const full = `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase();
        if (!full.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [teachers, filterStatus, searchTerm]);

  // Filtered Student Data
  const students = useMemo(() => {
    return users.filter((u) => {
      const r = typeof u.role === "string" ? u.role : (u.role as any)?.role_name || "";
      return r.toUpperCase() === "STUDENT" || r.toUpperCase() === "ROLE_STUDENT";
    });
  }, [users]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterStatus === "Active" && !s.is_active) return false;
      if (filterStatus === "Inactive" && s.is_active) return false;
      if (filterClass !== "All" && s.student_profile?.class_name !== filterClass) return false;
      if (searchTerm) {
        const full = `${s.first_name} ${s.last_name} ${s.email} ${s.student_profile?.index_no || ""} ${s.student_profile?.class_name || ""} ${s.student_profile?.assigned_teacher_name || ""}`.toLowerCase();
        if (!full.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [students, filterStatus, filterClass, searchTerm]);

  // Filtered Lesson Data
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (filterTerm !== "All") {
        const termObj = terms.find((t) => t.name === filterTerm);
        if (termObj && l.term !== termObj.id) return false;
      }
      if (searchTerm) {
        if (!l.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [lessons, filterTerm, terms, searchTerm]);

  // Data aggregations for charts
  const lessonsByTermData = useMemo(() => {
    const counts: Record<string, number> = {};
    terms.forEach((t) => {
      counts[t.name] = 0;
    });
    lessons.forEach((l) => {
      const termObj = terms.find((t) => t.id === l.term);
      const name = termObj ? termObj.name : "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [terms, lessons]);

  const studentsByClassData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeClasses.forEach((c) => {
      counts[c.name] = 0;
    });

    let unassignedCount = 0;

    students.forEach((s) => {
      const cName = s.student_profile?.class_name;
      if (cName && counts.hasOwnProperty(cName)) {
        counts[cName] += 1;
      } else {
        unassignedCount += 1;
      }
    });

    if (unassignedCount > 0) {
      counts["Unassigned"] = unassignedCount;
    }

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [activeClasses, students]);

  const userDistributionData = useMemo(() => {
    const teacherCount = teachers.length;
    const studentCount = students.length;
    return [
      { label: "Students", count: studentCount, color: "#126BFF" },
      { label: "Teachers", count: teacherCount, color: "#10B981" },
    ];
  }, [teachers, students]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
        Loading System Admin reports...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div className="teacher-card" style={{ padding: "20px 28px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Reports
          </h1>
          <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0", fontWeight: 500 }}>
            View structured summaries of users and academic administration data.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadReport}
          disabled={isGeneratingPdf}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: isGeneratingPdf ? "#94A3B8" : "#126BFF",
            color: "#FFFFFF",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            border: "none",
            cursor: isGeneratingPdf ? "not-allowed" : "pointer",
            boxShadow: isGeneratingPdf ? "none" : "0 4px 12px rgba(18, 107, 255, 0.25)",
            transition: "all 150ms ease",
          }}
        >
          <Download size={18} />
          {isGeneratingPdf ? "Generating..." : "Download Report"}
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="teacher-card" style={{ padding: "16px 28px", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={18} color="#5D78A3" />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>Filters:</span>
        </div>

        {(selectedReport === "lesson" || selectedReport === "system") && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Term:</label>
            <select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}
            >
              <option value="All">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {(selectedReport === "student" || selectedReport === "class") && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Class:</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}
            >
              <option value="All">All Classes</option>
              {activeClasses.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {(selectedReport === "teacher" || selectedReport === "student") && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative", marginLeft: "auto", minWidth: "220px" }}>
          <Search size={16} color="#5D78A3" style={{ position: "absolute", left: "10px", top: "9px" }} />
          <input
            type="text"
            placeholder="Search report..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "6px 12px 6px 34px", borderRadius: "8px", border: "1px solid #DCE6F3", fontSize: "14px", outline: "none" }}
          />
        </div>
      </div>

      {/* REPORT SELECTOR TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { id: "teacher", label: "Teacher Report" },
          { id: "student", label: "Student Report" },
          { id: "class", label: "Class Report" },
          { id: "lesson", label: "Lesson Report" },
          { id: "system", label: "System Summary" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedReport(tab.id as any)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              backgroundColor: selectedReport === tab.id ? "#126BFF" : "#FFFFFF",
              color: selectedReport === tab.id ? "#FFFFFF" : "#5D78A3",
              boxShadow: selectedReport === tab.id ? "0 4px 12px rgba(18, 107, 255, 0.25)" : "none",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT CONTENT */}

      {/* 1. TEACHER REPORT */}
      {selectedReport === "teacher" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Teachers</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{teachers.length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={22} />
              </div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Active Teachers</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{teachers.filter((t) => t.is_active).length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #EF4444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Inactive Teachers</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{teachers.filter((t) => !t.is_active).length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <XCircle size={22} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="teacher-card" style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Teacher Directory & Status</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Teacher Name</th>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Assigned Subjects</th>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                    <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                      {t.first_name} {t.last_name}
                    </td>
                    <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>{t.email}</td>
                    <td style={{ padding: "14px 12px", fontSize: "14px", color: "#3D5E8A" }}>
                      {t.teacher_profile?.subjects?.join(", ") || "General"}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: t.is_active ? "#ECFDF5" : "#FEF2F2", color: t.is_active ? "#059669" : "#EF4444" }}>
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. STUDENT REPORT */}
      {selectedReport === "student" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "24px" }}>
            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Students</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{students.length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={22} />
              </div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Active Students</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{students.filter((s) => s.is_active).length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Classes</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{activeClasses.length}</div>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SchoolIcon size={22} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="teacher-card" style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Student Directory & Class Assignments</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "600px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Student Name</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Index No</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Class</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Teacher</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                      <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                        {s.first_name} {s.last_name}
                      </td>
                      <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>{s.student_profile?.index_no || "-"}</td>
                      <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#3D5E8A" }}>
                        {s.student_profile?.class_name || "Unassigned"}
                      </td>
                      <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#126BFF" }}>
                        {s.student_profile?.assigned_teacher_name || "Unassigned"}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: s.is_active ? "#ECFDF5" : "#FEF2F2", color: s.is_active ? "#059669" : "#EF4444" }}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASS REPORT */}
      {selectedReport === "class" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Students by Class</h2>
              <RenderBarChart data={studentsByClassData} color="#126BFF" />
            </div>

            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Classes Overview</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E7EEF7", paddingBottom: "12px" }}>
                  <span style={{ color: "#5D78A3", fontSize: "14px", fontWeight: 600 }}>Total Configured Classes</span>
                  <span style={{ color: "#0B1F3A", fontSize: "18px", fontWeight: 700 }}>{activeClasses.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E7EEF7", paddingBottom: "12px" }}>
                  <span style={{ color: "#5D78A3", fontSize: "14px", fontWeight: 600 }}>Active Student Enrolments</span>
                  <span style={{ color: "#059669", fontSize: "18px", fontWeight: 700 }}>{students.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="teacher-card" style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Class Structure Directory</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "500px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Class Name</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Enrolled Students</th>
                    <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeClasses.map((c) => {
                    const classStudentsCount = students.filter((s) => s.student_profile?.class_name === c.name).length;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                        <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{c.name}</td>
                        <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#126BFF" }}>{classStudentsCount} students</td>
                        <td style={{ padding: "14px 12px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. LESSON REPORT */}
      {selectedReport === "lesson" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="teacher-card" style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Lessons by Term</h2>
            <RenderBarChart data={lessonsByTermData} color="#10B981" />
          </div>

          <div className="teacher-card" style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Syllabus Lessons Directory</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7EEF7" }}>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Lesson Title</th>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Term</th>
                  <th style={{ padding: "12px", fontSize: "13px", color: "#5D78A3", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.map((l) => {
                  const termObj = terms.find((t) => t.id === l.term);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #E7EEF7" }}>
                      <td style={{ padding: "14px 12px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{l.title}</td>
                      <td style={{ padding: "14px 12px", fontSize: "14px", color: "#5D78A3" }}>{termObj?.name || "Term 1"}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#ECFDF5", color: "#059669" }}>
                          Published
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SYSTEM SUMMARY REPORT */}
      {selectedReport === "system" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #126BFF" }}>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Teachers</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{teachers.length}</div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #10B981" }}>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Students</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{students.length}</div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #F59E0B" }}>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Classes</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{classes.length}</div>
            </div>

            <div className="teacher-card" style={{ padding: "20px 24px", marginBottom: 0, borderLeft: "4px solid #8B5CF6" }}>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Lessons</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A", marginTop: "4px" }}>{lessons.length}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>User Roles Distribution</h2>
              <RenderDoughnutChart items={userDistributionData} />
            </div>

            <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 16px 0" }}>Lessons by Academic Term</h2>
              <RenderBarChart data={lessonsByTermData} color="#8B5CF6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminReportsPage;
