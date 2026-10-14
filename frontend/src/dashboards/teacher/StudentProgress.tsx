import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { TrendingUp, FileText, CheckCircle, Star, History, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "../../styles/teacher.css";

type StudentProfile = {
  id: number;
  full_name: string;
};

type ProgressAttempt = {
  id: number;
  quiz_title: string;
  attempt_number: number;
  score: number;
  start_time: string;
  end_time: string;
};

const StudentProgress = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attempts, setAttempts] = useState<ProgressAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      setError("");
      setStudent(null);
      setAttempts([]);

      const token = getToken();
      try {
        const [studentRes, attemptsRes] = await Promise.all([
          fetch(`/api/accounts/users/${studentId}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/attempts/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (studentRes.status === 403 || studentRes.status === 404) {
          throw new Error("Student not found or access denied.");
        }

        if (!studentRes.ok) {
          throw new Error("Unable to fetch student profile.");
        }

        const studentData = await studentRes.json();
        const fn = studentData.first_name || "";
        const ln = studentData.last_name || "";
        studentData.full_name = `${fn} ${ln}`.trim() || studentData.username;

        let studentAttempts: ProgressAttempt[] = [];
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          const rawAttempts = Array.isArray(attemptsData) ? attemptsData : (attemptsData.results || []);
          const targetUserId = parseInt(studentId || "0", 10);
          const targetProfileId = studentData.student_profile?.id || targetUserId;

          studentAttempts = rawAttempts
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
            .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); // sort ascending for chart
        }

        setStudent(studentData);
        setAttempts(studentAttempts);
      } catch (err: any) {
        setError(err.message || "Failed to load student progress.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [studentId]);

  const getDurationString = (start: string, end: string): string => {
    if (!start || !end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return "-";
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>Loading progress profile...</div>;
  if (error || !student) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054", fontFamily: '"Inter", sans-serif' }}>{error || "Student not found."}</div>;

  const totalCompleted = attempts.length;
  const avgScore = totalCompleted > 0 ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / totalCompleted) : 0;
  const maxScore = totalCompleted > 0 ? Math.max(...attempts.map(a => a.score)) : 0;

  // Chart Data Preparation
  const chartData = attempts.map((att, index) => ({
    name: `Quiz ${index + 1}`,
    score: att.score,
    title: att.quiz_title
  }));

  const reversedAttempts = [...attempts].reverse(); // newest first for the table

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: "#FFFFFF", padding: "12px", border: "1px solid #E4ECF6", borderRadius: "8px", boxShadow: "0 4px 12px rgba(18,63,110,0.1)" }}>
          <p style={{ margin: "0 0 4px 0", fontWeight: 600, color: "#0B1F3A", fontSize: "13px" }}>{payload[0].payload.title}</p>
          <p style={{ margin: 0, color: "#126BFF", fontSize: "14px", fontWeight: 700 }}>Score: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Breadcrumb */}
      <div style={{ fontSize: "14px", color: "#5D78A3", display: "flex", gap: "8px", alignItems: "center" }}>
        <Link to="/teacher/dashboard" style={{ color: "#5D78A3", textDecoration: "none" }}>Dashboard</Link>
        <span>&gt;</span>
        <Link to="/teacher/students" style={{ color: "#5D78A3", textDecoration: "none" }}>Students</Link>
        <span>&gt;</span>
        <Link to={`/teacher/students/${studentId}`} style={{ color: "#5D78A3", textDecoration: "none" }}>{student.full_name}</Link>
        <span>&gt;</span>
        <span style={{ fontWeight: 600, color: "#0B1F3A" }}>Progress</span>
      </div>

      {/* Header Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Student Progress</h1>
            <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0 }}>Track performance over time for {student.full_name}.</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate(`/teacher/students/${studentId}`)}
          style={{ height: "42px", padding: "0 20px", borderRadius: "9px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#0B1F3A", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
        >
          Back to Profile
        </button>
      </div>

      {/* Main Layout: Chart + Stats */}
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        
        {/* Left: Performance Trend Chart */}
        <div style={{ flex: 2, minWidth: "500px", backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <TrendingUp size={18} color="#126BFF" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Performance Trend</h2>
          </div>
          
          <div style={{ height: "300px", width: "100%" }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4ECF6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#5D78A3" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#5D78A3" }} dx={-10} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#126BFF" strokeWidth={3} activeDot={{ r: 6, fill: "#126BFF", stroke: "#FFFFFF", strokeWidth: 2 }} dot={{ r: 4, fill: "#FFFFFF", stroke: "#126BFF", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#5D78A3", fontSize: "14px" }}>
                Not enough data to display performance trend.
              </div>
            )}
          </div>
        </div>

        {/* Right: Metrics Column */}
        <div style={{ flex: 1, minWidth: "250px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={20} color="#6C4BFF" />
              </div>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Total Quizzes</div>
            </div>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{totalCompleted}</div>
          </div>
          
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#E9FBF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={20} color="#16B978" />
              </div>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Average Score</div>
            </div>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{avgScore}%</div>
          </div>

          <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#FFF7E6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={20} color="#F4A300" />
              </div>
              <div style={{ fontSize: "14px", color: "#5D78A3", fontWeight: 600 }}>Highest Score</div>
            </div>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{maxScore}%</div>
          </div>
        </div>
      </div>

      {/* Quiz Attempts History */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", overflow: "hidden" }}>
        
        <div style={{ padding: "24px", borderBottom: "1px solid #E4ECF6", display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={18} color="#126BFF" />
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Quiz Attempts History</h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FBFF", borderBottom: "1px solid #E4ECF6" }}>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Quiz Name</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Attempt No</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Completion Time</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Duration</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Score</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {reversedAttempts.map((att, index) => {
                const passed = att.score >= 50;
                return (
                  <tr key={att.id} style={{ borderBottom: index === reversedAttempts.length - 1 ? "none" : "1px solid #E4ECF6" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{att.quiz_title}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#5D78A3" }}>{att.attempt_number}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#5D78A3" }}>{new Date(att.end_time).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", color: "#5D78A3" }}>{getDurationString(att.start_time, att.end_time)}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: "#0B1F3A" }}>{att.score}%</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, backgroundColor: passed ? "#E9FBF4" : "#FFF1F3", color: passed ? "#16B978" : "#FF4054" }}>
                        {passed ? "Pass" : "Fail"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {reversedAttempts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
                    No quiz attempts found for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default StudentProgress;

