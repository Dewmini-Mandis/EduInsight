import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  School as SchoolIcon,
  PlusCircle,
  Activity,
  ArrowRight,
  UserCheck,
  Award,
  Trash2,
  Clock,
} from "lucide-react";
import { getToken } from "../../auth/authUtils";

interface ActivityItem {
  id: number;
  actor_name?: string;
  role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  timestamp: string;
}

const formatRelativeTime = (timestampString: string): string => {
  if (!timestampString) return "";
  const date = new Date(timestampString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
};

const getCleanActivityDescription = (act: ActivityItem): string => {
  let desc = (act.description || "").trim();
  
  // If description is missing or is identical to raw code string like "UPDATED_USER User"
  if (
    !desc ||
    desc.toUpperCase().includes("UPDATED_USER") ||
    desc.toUpperCase().includes("CREATED_USER") ||
    desc.toUpperCase().includes("DELETED_USER") ||
    desc === `${act.action} ${act.entity_type}`
  ) {
    const rawAction = (act.action || "").toUpperCase();
    const rawEntity = (act.entity_type || "").toUpperCase();

    if (rawAction.includes("UPDATE") || rawAction.includes("EDIT")) {
      if (rawEntity.includes("TEACHER")) return "Updated teacher account details";
      if (rawEntity.includes("STUDENT")) return "Updated student account details";
      if (rawEntity.includes("USER")) return "Updated user account details";
      if (rawEntity.includes("LESSON")) return "Updated lesson content";
      if (rawEntity.includes("SKILL")) return "Updated skill information";
      return `Updated ${act.entity_type ? act.entity_type.toLowerCase() : "record"}`;
    }
    if (rawAction.includes("CREATE") || rawAction.includes("ADD")) {
      if (rawEntity.includes("TEACHER")) return "Created new teacher account";
      if (rawEntity.includes("STUDENT")) return "Created new student account";
      if (rawEntity.includes("USER")) return "Created new user account";
      if (rawEntity.includes("LESSON")) return "Created new lesson";
      if (rawEntity.includes("SKILL")) return "Created new skill";
      return `Created new ${act.entity_type ? act.entity_type.toLowerCase() : "record"}`;
    }
    if (rawAction.includes("DELETE") || rawAction.includes("REMOVE")) {
      if (rawEntity.includes("TEACHER")) return "Deleted teacher account";
      if (rawEntity.includes("STUDENT")) return "Deleted student account";
      if (rawEntity.includes("USER")) return "Deleted user account";
      if (rawEntity.includes("LESSON")) return "Deleted lesson";
      if (rawEntity.includes("SKILL")) return "Deleted skill";
      return `Deleted ${act.entity_type ? act.entity_type.toLowerCase() : "record"}`;
    }
    if (rawAction.includes("LOGIN")) return "User logged into system";
    if (rawAction.includes("LOGOUT")) return "User logged out of system";

    const cleaned = rawAction.replace(/_/g, " ").toLowerCase();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return desc;
};

const getCleanActorName = (act: ActivityItem): string => {
  if (act.actor_name && act.actor_name.trim()) {
    return act.actor_name.trim();
  }
  return "System Administrator";
};

// Compact SVG Doughnut Chart for User Overview (Teachers + Students ONLY)
const RenderUserOverviewDoughnut: React.FC<{
  teachers: number;
  students: number;
}> = ({ teachers, students }) => {
  const total = teachers + students || 1;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const segs = [
    { label: "Students", count: students, color: "#126BFF" },
    { label: "Teachers", count: teachers, color: "#10B981" },
  ];

  let accumulatedAngle = 0;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#5D78A3" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color }} />
            {s.label} ({s.count})
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: "140px" }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <g transform="rotate(-90 70 70)">
            {segs.map((seg) => {
              const dashOffset = circumference - (seg.count / total) * circumference;
              const rotation = accumulatedAngle;
              accumulatedAngle += (seg.count / total) * 360;

              return (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(${rotation} 70 70)`}
                />
              );
            })}
          </g>
        </svg>
        <div style={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A" }}>{teachers + students}</div>
          <div style={{ fontSize: "11px", color: "#5D78A3" }}>Total Users</div>
        </div>
      </div>
    </div>
  );
};

const SystemAdminDashboard = () => {
  const navigate = useNavigate();

  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [classCount, setClassCount] = useState<number>(0);
  const [lessonCount, setLessonCount] = useState<number>(0);
  const [termCount, setTermCount] = useState<number>(0);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesError, setActivitiesError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setActivitiesError(false);
    try {
      const [statsRes, usersRes, classesRes, lessonsRes, termsRes, activitiesRes] = await Promise.all([
        fetch("/api/accounts/users/stats/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/accounts/users/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/classes/classrooms/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/lessons/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/terms/?page_size=1000", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/accounts/activities/?limit=8", { headers: { Authorization: `Token ${token}` } }),
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setTeacherCount(typeof stats.teachers === "number" ? stats.teachers : 0);
        setStudentCount(typeof stats.students === "number" ? stats.students : 0);
      } else if (usersRes.ok) {
        const users = await usersRes.json();
        const userList: any[] = Array.isArray(users) ? users : users.results || [];
        const teachers = userList.filter((u) => {
          const r = typeof u.role === "string" ? u.role : u.role?.role_name || "";
          return r.toUpperCase() === "TEACHER" || r.toUpperCase() === "ROLE_TEACHER";
        });
        const students = userList.filter((u) => {
          const r = typeof u.role === "string" ? u.role : u.role?.role_name || "";
          return r.toUpperCase() === "STUDENT" || r.toUpperCase() === "ROLE_STUDENT";
        });

        setTeacherCount(teachers.length);
        setStudentCount(students.length);
      }

      if (classesRes.ok) {
        const classes = await classesRes.json();
        const count = typeof classes.count === "number" ? classes.count : Array.isArray(classes) ? classes.length : (classes.results || []).length;
        setClassCount(count);
      }

      if (lessonsRes.ok) {
        const lessons = await lessonsRes.json();
        const count = typeof lessons.count === "number" ? lessons.count : Array.isArray(lessons) ? lessons.length : (lessons.results || []).length;
        setLessonCount(count);
      }

      if (termsRes.ok) {
        const terms = await termsRes.json();
        const count = typeof terms.count === "number" ? terms.count : Array.isArray(terms) ? terms.length : (terms.results || []).length;
        setTermCount(count);
      }

      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        const actList = Array.isArray(actData) ? actData : actData.results || [];
        setActivities(actList);
      } else {
        const fallbackRes = await fetch("/api/audit/activities/?limit=8", { headers: { Authorization: `Token ${token}` } });
        if (fallbackRes.ok) {
          const actData = await fallbackRes.json();
          setActivities(Array.isArray(actData) ? actData : actData.results || []);
        } else {
          setActivitiesError(true);
        }
      }
    } catch (err) {
      console.error("Error loading admin dashboard data", err);
      setActivitiesError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const renderActivityIcon = (entityType: string, action: string) => {
    const et = (entityType || "").toUpperCase();
    const act = (action || "").toUpperCase();

    if (act === "DELETE") {
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={18} />
        </div>
      );
    }
    if (et === "TEACHER") {
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <UserCheck size={18} />
        </div>
      );
    }
    if (et === "STUDENT") {
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={18} />
        </div>
      );
    }
    if (et === "LESSON") {
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#F3E8FF", color: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BookOpen size={18} />
        </div>
      );
    }
    if (et === "SKILL") {
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Award size={18} />
        </div>
      );
    }
    return (
      <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#F1F5F9", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Activity size={18} />
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#5D78A3" }}>
        Loading System Admin dashboard...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      {/* SUMMARY CARDS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* 1. Total Teachers */}
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #10B981", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#5D78A3", marginBottom: "4px" }}>Total Teachers</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{teacherCount}</div>
            <div style={{ fontSize: "12px", color: "#10B981", marginTop: "4px", fontWeight: 500 }}>Active teaching staff</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCheck size={24} />
          </div>
        </div>

        {/* 2. Total Students */}
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #126BFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#5D78A3", marginBottom: "4px" }}>Total Students</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{studentCount}</div>
            <div style={{ fontSize: "12px", color: "#126BFF", marginTop: "4px", fontWeight: 500 }}>Registered learners</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
        </div>

        {/* 3. Total Classes */}
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #F59E0B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#5D78A3", marginBottom: "4px" }}>Total Classes</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{classCount}</div>
            <div style={{ fontSize: "12px", color: "#D97706", marginTop: "4px", fontWeight: 500 }}>Configured classrooms</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SchoolIcon size={24} />
          </div>
        </div>

        {/* 4. Total Lessons */}
        <div className="teacher-card" style={{ padding: "22px 26px", marginBottom: 0, borderLeft: "4px solid #8B5CF6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#5D78A3", marginBottom: "4px" }}>Total Lessons</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0B1F3A" }}>{lessonCount}</div>
            <div style={{ fontSize: "12px", color: "#8B5CF6", marginTop: "4px", fontWeight: 500 }}>Syllabus lessons & skills</div>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#F3E8FF", color: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={24} />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="teacher-card" style={{ padding: "18px 26px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Quick Management Actions</h3>
          <p style={{ fontSize: "13px", color: "#5D78A3", margin: "2px 0 0 0" }}>Shortcuts for frequent system administrative tasks.</p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate("/system-admin/teachers")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#EBF5FF",
              color: "#126BFF",
              border: "1px solid #C8D8EB",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PlusCircle size={16} /> Manage Teachers
          </button>
          <button
            type="button"
            onClick={() => navigate("/system-admin/students")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #A7F3D0",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PlusCircle size={16} /> Manage Students
          </button>
          <button
            type="button"
            onClick={() => navigate("/system-admin/lessons")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#F3E8FF",
              color: "#8B5CF6",
              border: "1px solid #DDD6FE",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PlusCircle size={16} /> Create Lesson
          </button>
        </div>
      </div>

      {/* TWO-COLUMN ANALYTICS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* LEFT: USER OVERVIEW */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>User Overview</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 16px 0" }}>Active teacher and student distribution.</p>
          <RenderUserOverviewDoughnut teachers={teacherCount} students={studentCount} />
        </div>

        {/* RIGHT: ACADEMIC STRUCTURE OVERVIEW */}
        <div className="teacher-card" style={{ padding: "24px 28px", marginBottom: 0 }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Academic Structure Overview</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 16px 0" }}>Curriculum and administrative totals.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E7EEF7", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFBEB", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SchoolIcon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Active Classrooms</div>
                  <div style={{ fontSize: "12px", color: "#5D78A3" }}>Configured student groups</div>
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A" }}>{classCount}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E7EEF7", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#F3E8FF", color: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Configured Terms</div>
                  <div style={{ fontSize: "12px", color: "#5D78A3" }}>Academic terms with lessons</div>
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A" }}>{termCount}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#EBF5FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>Students per Class Ratio</div>
                  <div style={{ fontSize: "12px", color: "#5D78A3" }}>Average class occupancy</div>
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#126BFF" }}>
                {classCount > 0 ? Math.round(studentCount / classCount) : 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITIES SECTION */}
      <div className="teacher-card" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Recent Activities</h2>
            <p style={{ fontSize: "14px", color: "#5D78A3", margin: "2px 0 0 0" }}>Latest administrative actions across EduInsight.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/system-admin/reports")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: "#126BFF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View System Reports <ArrowRight size={16} />
          </button>
        </div>

        {activitiesError ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#FF4054", fontSize: "14px" }}>
            Unable to load recent activities.
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center", backgroundColor: "#F7FAFE", borderRadius: "12px", border: "1px dashed #DCE6F3" }}>
            <Clock size={36} color="#A0B4D0" style={{ marginBottom: "8px" }} />
            <h4 style={{ color: "#0B1F3A", margin: "0 0 4px 0", fontSize: "16px" }}>No recent activities yet</h4>
            <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Administrative actions will appear here as they occur.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  gap: "16px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {renderActivityIcon(act.entity_type, act.action)}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>
                      {getCleanActivityDescription(act)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "2px" }}>
                      Performed by {getCleanActorName(act)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "12.5px", color: "#8B9EBA", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {formatRelativeTime(act.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdminDashboard;
