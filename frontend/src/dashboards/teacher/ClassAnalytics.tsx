import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import FilterBar from "../../components/FilterBar";

type StudentPerformance = {
  id: number;
  name: string;
  avgScore: number;
  completion: number;
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  lastActivity: string;
  initials: string;
};

const ClassAnalytics = () => {
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      if (!token) {
        setError("Session expired.");
        setLoading(false);
        return;
      }

      try {
        const [usersRes, attemptsRes, quizzesRes] = await Promise.all([
          fetch("/api/accounts/users/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/attempts/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("/api/quizzes/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!usersRes.ok || !attemptsRes.ok || !quizzesRes.ok) {
          throw new Error("Unable to fetch analytics data.");
        }

        const usersData = await usersRes.json() as any[];
        const attemptsData = await attemptsRes.json() as any[];
        const quizzesData = await quizzesRes.json() as any[];

        const totalQuizzes = quizzesData.length || 1;

        // Group attempts by student
        const performanceList = usersData.map((user) => {
          const studentAttempts = attemptsData.filter(att => att.student === user.id || att.student_name === user.full_name);
          
          let avgScore = 0;
          let completion = 0;
          let riskLevel: "Low Risk" | "Moderate Risk" | "High Risk" = "Low Risk";
          let lastActivity = "Never";

          if (studentAttempts.length > 0) {
            const totalScore = studentAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
            avgScore = Math.round(totalScore / studentAttempts.length);
            
            // Unique quizzes attempted
            const uniqueQuizzes = new Set(studentAttempts.map(att => att.quiz));
            completion = Math.round((uniqueQuizzes.size / totalQuizzes) * 100);
            
            // Sort attempts by time to find last activity
            const sortedAttempts = [...studentAttempts].sort(
              (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            );
            const lastTime = new Date(sortedAttempts[0].start_time);
            lastActivity = lastTime.toLocaleDateString() + " " + lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (avgScore < 50) riskLevel = "High Risk";
            else if (avgScore < 65) riskLevel = "Moderate Risk";
          }

          const name = user.full_name || user.username;
          const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

          return {
            id: user.id,
            name,
            initials,
            avgScore,
            completion,
            riskLevel,
            lastActivity
          };
        });

        setStudents(performanceList);
      } catch (err: any) {
        setError(err.message || "Failed to compile class analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading analytics panel...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--danger)" }}>
        <h3>Error Loading Analytics</h3>
        <p>{error}</p>
      </div>
    );
  }

  const columns: Column<StudentPerformance>[] = [
    {
      key: "name",
      header: "Student",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "32px", height: "32px", borderRadius: "50%", 
            backgroundColor: "var(--blue-100)", color: "var(--blue-600)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: "12px", fontWeight: "600" 
          }}>
            {item.initials}
          </div>
          <span style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.name}</span>
        </div>
      )
    },
    {
      key: "avgScore",
      header: "Avg Score",
      render: (item) => (
        <span style={{ fontWeight: "700", color: item.avgScore >= 65 ? "var(--success)" : item.avgScore >= 50 ? "var(--warning)" : "var(--danger)" }}>
          {item.avgScore}%
        </span>
      )
    },
    {
      key: "completion",
      header: "Completion",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", width: "32px" }}>{item.completion}%</span>
          <div style={{ width: "60px", height: "6px", borderRadius: "3px", backgroundColor: "var(--surface-muted)", overflow: "hidden" }}>
            <div style={{ width: `${item.completion}%`, height: "100%", backgroundColor: item.completion >= 80 ? "var(--success)" : "var(--blue-500)", borderRadius: "3px" }}></div>
          </div>
        </div>
      )
    },
    {
      key: "riskLevel",
      header: "Risk Level",
      render: (item) => <StatusBadge status={item.riskLevel} label={item.riskLevel.split(" ")[0]} />
    },
    {
      key: "lastActivity",
      header: "Last Activity",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.lastActivity}</span>
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      render: (item) => (
        <button
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "var(--blue-600)", display: "flex", margin: "0 auto" }}
          onClick={() => navigate(`/teacher/students/${item.id}/progress`)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
        <MetricCard 
          title="Active Learners" 
          value="34" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          trend={{ value: "12%", isPositive: true, label: "vs last 7 days" }}
          infoTooltip="Students active in the last 7 days"
        />
        <MetricCard 
          title="Class Average" 
          value="72%" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
          iconBgColor="rgba(24, 182, 91, 0.1)"
          iconColor="var(--success)"
          trend={{ value: "5%", isPositive: true, label: "vs last 7 days" }}
          infoTooltip="Average score across all assessments"
        />
        <MetricCard 
          title="Completion Rate" 
          value="81%" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
          iconBgColor="rgba(101, 61, 245, 0.1)"
          iconColor="var(--purple)"
          trend={{ value: "7%", isPositive: true, label: "vs last 7 days" }}
          infoTooltip="Percentage of assigned tasks completed"
        />
        <MetricCard 
          title="At-Risk Students" 
          value="6" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          iconBgColor="rgba(245, 34, 61, 0.1)"
          iconColor="var(--danger)"
          trend={{ value: "2%", isPositive: false, label: "vs last 7 days" }}
          infoTooltip="Students identified as High Risk"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "24px" }}>
        <ChartCard 
          title="Performance Trend" 
          subtitle="Average score over time"
          infoTooltip="Historical average performance"
          headerAction={
            <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", outline: "none" }}>
              <option>Last 8 Weeks</option>
            </select>
          }
        >
          {/* Placeholder for actual line chart */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "16px 0 0 0", borderBottom: "1px solid var(--border)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to top, rgba(20, 99, 243, 0.1) 0%, transparent 100%)", clipPath: "polygon(0% 60%, 20% 50%, 40% 40%, 60% 30%, 80% 35%, 100% 20%, 100% 100%, 0% 100%)" }} />
            <svg viewBox="0 0 400 120" style={{ width: "100%", height: "100%", position: "absolute", zIndex: 1, overflow: "visible" }}>
              <path d="M0,70 L80,60 L160,48 L240,36 L320,42 L400,24" fill="none" stroke="var(--blue-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {[
                {x:0,y:70,val:"48%"},{x:80,y:60,val:"54%"},{x:160,y:48,val:"57%"},
                {x:240,y:36,val:"63%"},{x:320,y:42,val:"67%"},{x:400,y:24,val:"72%"}
              ].map(pt => (
                <g key={pt.x}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="var(--surface)" stroke="var(--blue-500)" strokeWidth="2" />
                  <text x={pt.x} y={pt.y - 12} fontSize="10" fill="var(--navy-950)" textAnchor="middle" fontWeight="600">{pt.val}</text>
                </g>
              ))}
            </svg>
            {/* Axis labels */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "auto", paddingTop: "8px", fontSize: "10px", color: "var(--text-secondary)", zIndex: 2 }}>
              <span>Apr 7</span><span>Apr 14</span><span>Apr 21</span><span>Apr 28</span><span>May 5</span><span>May 12</span><span>May 19</span><span>May 26</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "16px", backgroundColor: "var(--surface-muted)", padding: "12px", borderRadius: "8px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy-950)" }}>Consistent improvement this period</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Class average increased by 24 percentage points compared to the previous 8 weeks.</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard 
          title="Topic Mastery" 
          subtitle="Average mastery by topic"
          infoTooltip="Mastery levels per subject topic"
          headerAction={
            <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px", outline: "none" }}>
              <option>All Topics</option>
            </select>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, justifyContent: "center" }}>
            {[
              { topic: "Sets", pct: 82, color: "var(--blue-600)" },
              { topic: "Real Numbers", pct: 74, color: "var(--blue-600)" },
              { topic: "Percentage", pct: 61, color: "var(--blue-600)" },
              { topic: "Profit and Loss", pct: 53, color: "var(--blue-600)" },
              { topic: "Algebraic Expressions", pct: 48, color: "var(--blue-600)" },
            ].map((item) => (
              <div key={item.topic} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: "var(--navy-950)" }}>
                  <span>{item.topic}</span>
                  <span>{item.pct}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", borderRadius: "4px", backgroundColor: "var(--surface-muted)", overflow: "hidden" }}>
                  <div style={{ width: `${item.pct}%`, height: "100%", borderRadius: "4px", backgroundColor: item.color }}></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-secondary)", marginTop: "8px" }}>
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </ChartCard>

        <ChartCard title="Engagement Distribution" subtitle="Based on student activity" footer={
          <a href="#" style={{ color: "var(--blue-600)", fontSize: "13px", fontWeight: "500", textDecoration: "none" }}>View engagement insights &rarr;</a>
        }>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "16px 0" }}>
            {/* CSS Donut Chart Mock */}
            <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "conic-gradient(var(--success) 0% 38%, var(--blue-500) 38% 71%, var(--warning) 71% 90%, var(--danger) 90% 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--navy-950)", lineHeight: 1 }}>42</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Students</span>
              </div>
            </div>
            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "High Engagement", color: "var(--success)", count: 16, pct: 38 },
                { label: "Moderate Engagement", color: "var(--blue-500)", count: 14, pct: 33 },
                { label: "Low Engagement", color: "var(--warning)", count: 8, pct: 19 },
                { label: "Very Low Engagement", color: "var(--danger)", count: 4, pct: 10 },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--navy-950)", fontWeight: "500" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>{item.count} ({item.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        <ChartCard 
          title="Student Performance" 
          subtitle="Detailed performance overview for all students"
          infoTooltip="List of students"
          footer={
            <a href="#" style={{ color: "var(--blue-600)", fontSize: "13px", fontWeight: "500", textDecoration: "none" }}>View all students &rarr;</a>
          }
        >
          <div style={{ margin: "0 -20px" }}>
            <DataTable 
              columns={columns} 
              data={students.slice(0, 6)} // Mock showing top 6
              keyExtractor={(s) => s.id} 
            />
          </div>
        </ChartCard>

        <ChartCard title="Assessment Breakdown" subtitle="Performance by assessment type" infoTooltip="Types of assessments" footer={
          <a href="#" style={{ color: "var(--blue-600)", fontSize: "13px", fontWeight: "500", textDecoration: "none" }}>View assessment details &rarr;</a>
        }>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "16px 0" }}>
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "conic-gradient(var(--blue-600) 0% 50%, var(--success) 50% 75%, var(--warning) 75% 91%, var(--purple) 91% 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--navy-950)", lineHeight: 1 }}>128</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "center" }}>Assessments</span>
              </div>
            </div>
            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Quizzes", color: "var(--blue-600)", count: 64, pct: 50, avg: 71 },
                { label: "Assignments", color: "var(--success)", count: 32, pct: 25, avg: 74 },
                { label: "Tests", color: "var(--warning)", count: 20, pct: 16, avg: 68 },
                { label: "Projects", color: "var(--purple)", count: 12, pct: 19, avg: 78 },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                    <span style={{ fontSize: "12px", color: "var(--navy-950)", fontWeight: "500" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--navy-950)", width: "60px", textAlign: "right" }}>{item.count} ({item.pct}%)</span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", width: "80px", textAlign: "right" }}>Avg Score: {item.avg}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default ClassAnalytics;
