import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { User, Edit3, BarChart2, Info, Settings, FileText, CheckCircle, Star, Clock, Trash2 } from "lucide-react";
import "../../styles/teacher.css";

type StudentProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials?: string;
  student_profile?: {
    index_no: string;
    class_name: string;
    class_room?: { id: number; name: string };
  };
  is_active?: boolean;
};

type ProgressAttempt = {
  id: number;
  quiz_title: string;
  attempt_number: number;
  score: number;
  start_time: string;
  end_time: string;
};

const StudentDetails = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attempts, setAttempts] = useState<ProgressAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      setProfile(null);
      setAttempts([]);

      const token = getToken();
      try {
        const [profileRes, attemptsRes] = await Promise.all([
          fetch(`/api/accounts/users/${studentId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/attempts/", {
            headers: { Authorization: `Token ${token}` },
          })
        ]);

        if (profileRes.status === 403 || profileRes.status === 404) {
          throw new Error("Student not found or access denied.");
        }
        if (!profileRes.ok) throw new Error("Could not load student profile.");
        
        const data = await profileRes.json();
        const fn = data.first_name || "";
        const ln = data.last_name || "";
        setProfile({
          ...data,
          full_name: `${fn} ${ln}`.trim() || data.username,
          initials: `${fn.charAt(0) || ""}${ln.charAt(0) || ""}`.toUpperCase() || "ST",
          is_active: data.is_active !== undefined ? data.is_active : true
        });

        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          const rawAttempts = Array.isArray(attemptsData) ? attemptsData : (attemptsData.results || []);
          const targetUserId = parseInt(studentId || "0", 10);
          const targetProfileId = data.student_profile?.id || targetUserId;

          const studentAttempts = rawAttempts
            .filter((att: any) => {
              const attStudentId = typeof att.student === "object" ? att.student?.id : att.student;
              const attUserId = typeof att.student === "object" ? att.student?.user : att.student_user_id;
              return (
                attStudentId === targetProfileId ||
                attStudentId === targetUserId ||
                attUserId === targetUserId ||
                att.student_id === targetProfileId
              );
            })
            .map((att: any) => ({
              id: att.id,
              quiz_title: att.quiz_title,
              attempt_number: att.attempt_number,
              score: att.score,
              start_time: att.start_time,
              end_time: att.end_time
            }))
            .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
          setAttempts(studentAttempts);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleDelete = async () => {
    if (!profile) return;
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete student "${profile.full_name}"? This action cannot be undone.`)) {
      return;
    }

    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${studentId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete student profile.");
      
      alert("Student profile deleted successfully.");
      navigate("/teacher/students");
    } catch (err: any) {
      alert(err.message || "Could not delete student.");
    }
  };

  const getDurationString = (start: string, end: string): string => {
    if (!start || !end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return "-";
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} min`;
  };

  const getTotalStudyTime = (): string => {
    let totalMs = 0;
    attempts.forEach(att => {
      if (att.start_time && att.end_time) {
        totalMs += Math.max(0, new Date(att.end_time).getTime() - new Date(att.start_time).getTime());
      }
    });
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>Loading student profile...</div>;
  if (error || !profile) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054", fontFamily: '"Inter", sans-serif' }}>{error || "Student not found."}</div>;

  const totalCompleted = attempts.length;
  const avgScore = totalCompleted > 0 ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / totalCompleted) : 0;
  const maxScore = totalCompleted > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
  const recentAttempts = attempts.slice(0, 5); // Just show top 5 in recent

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Student Profile</h1>
            <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0 }}>View and manage student details, progress, and activity.</p>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={() => navigate(`/teacher/students/${studentId}/edit`)}
            style={{ height: "42px", padding: "0 16px", borderRadius: "9px", border: "1px solid #126BFF", backgroundColor: "#FFFFFF", color: "#126BFF", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s" }}
          >
            <Edit3 size={16} />
            Edit Details
          </button>
          <button 
            onClick={() => navigate(`/teacher/students/${studentId}/progress`)}
            style={{ height: "42px", padding: "0 20px", borderRadius: "9px", background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)", transition: "all 0.2s" }}
          >
            <BarChart2 size={16} />
            View Progress
          </button>
        </div>
      </div>

      {/* Profile Summary & Content */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "32px" }}>
        
        {/* Avatar & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#EAF3FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700, flexShrink: 0 }}>
            {profile.initials}
          </div>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 8px 0" }}>{profile.full_name}</h2>
            {profile.is_active ? (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", backgroundColor: "#E9FBF4", color: "#16B978", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                Active
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", backgroundColor: "#FFF1F3", color: "#FF4054", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Info & Quick Actions Grid */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "40px" }}>
          
          {/* Left: Student Information */}
          <div style={{ flex: 3, minWidth: "300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Info size={18} color="#126BFF" />
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Student Information</h3>
            </div>
            <div style={{ backgroundColor: "#F8FBFF", border: "1px solid #DCE6F3", borderRadius: "10px", padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Full Name</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{profile.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Index Number</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{profile.student_profile?.index_no || "N/A"}</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Email Address</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#126BFF" }}>{profile.email}</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Classroom</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0B1F3A" }}>{profile.student_profile?.class_room?.name || profile.student_profile?.class_name || "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div style={{ flex: 1, minWidth: "250px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Settings size={18} color="#5D78A3" />
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Quick Actions</h3>
            </div>
            <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #DCE6F3", borderRadius: "10px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center", height: "calc(100% - 40px)", boxSizing: "border-box" }}>
              <button 
                onClick={handleDelete}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#FFF1F3", color: "#FF4054", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
              >
                <Trash2 size={16} />
                Delete Student Profile
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <BarChart2 size={18} color="#6C4BFF" />
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Recent Activity</h3>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ border: "1px solid #E4ECF6", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={22} color="#6C4BFF" />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Quizzes Completed</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{totalCompleted}</div>
              </div>
            </div>
            <div style={{ border: "1px solid #E4ECF6", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", backgroundColor: "#E9FBF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle size={22} color="#16B978" />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Average Score</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{avgScore}%</div>
              </div>
            </div>
            <div style={{ border: "1px solid #E4ECF6", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", backgroundColor: "#FFF7E6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Star size={22} color="#F4A300" />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Highest Score</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{maxScore}%</div>
              </div>
            </div>
            <div style={{ border: "1px solid #E4ECF6", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", backgroundColor: "#EAF3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={22} color="#126BFF" />
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#5D78A3", marginBottom: "4px" }}>Total Study Time</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{getTotalStudyTime()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Quiz Attempts */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} color="#126BFF" />
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Recent Quiz Attempts</h3>
            </div>
            <button 
              onClick={() => navigate(`/teacher/students/${studentId}/progress`)}
              style={{ background: "none", border: "none", color: "#126BFF", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              View All &gt;
            </button>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #E4ECF6", borderRadius: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FBFF", borderBottom: "1px solid #E4ECF6" }}>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Quiz Name</th>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Attempt No</th>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Completion Time</th>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Duration</th>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Score</th>
                  <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((att, i) => {
                  const passed = att.score >= 50; // Just assume 50 is pass
                  return (
                    <tr key={att.id} style={{ borderBottom: i === recentAttempts.length - 1 ? "none" : "1px solid #E4ECF6" }}>
                      <td style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{att.quiz_title}</td>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#5D78A3" }}>{att.attempt_number}</td>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#5D78A3" }}>{new Date(att.end_time).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</td>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#5D78A3" }}>{getDurationString(att.start_time, att.end_time)}</td>
                      <td style={{ padding: "12px 20px", fontSize: "14px", color: "#5D78A3" }}>{att.score}%</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, backgroundColor: passed ? "#E9FBF4" : "#FFF1F3", color: passed ? "#16B978" : "#FF4054" }}>
                          {passed ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {recentAttempts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>No recent quiz attempts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDetails;

