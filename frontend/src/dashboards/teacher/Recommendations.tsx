import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import StatusBadge from "../../components/StatusBadge";
import FilterBar from "../../components/FilterBar";
import EmptyState from "../../components/EmptyState";

type RecommendationItem = {
  id: number;
  student: number;
  student_name: string;
  topic: string;
  recommended_activity: string;
  created_at: string;
};

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptedCount, setAcceptedCount] = useState(16);
  const [filterTopic, setFilterTopic] = useState("All Topics");

  const fetchRecommendations = async () => {
    const token = getToken();
    if (!token) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/recommendations/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Unable to fetch recommendations.");
      const data = await res.json() as RecommendationItem[];
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleAssign = (topic: string) => {
    alert(`AI recommendation for topic "${topic}" has been assigned to all target students.`);
    setAcceptedCount(prev => prev + 1);
  };

  const handleDismiss = (id: number) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
  };

  // Group recommendations by topic
  const groupedRecommendations = recommendations.reduce((acc: any[], current) => {
    const existing = acc.find(item => item.topic === current.topic);
    if (existing) {
      existing.students.push(current.student_name);
      existing.ids.push(current.id);
    } else {
      let confidence = 72;
      let priority: "High" | "Medium" | "Low" = "Low";
      let activity = current.recommended_activity;

      if (current.topic.includes("Linear")) {
        confidence = 86;
        priority = "High";
        activity = "Practice Worksheet Set";
      } else if (current.topic.includes("Percentage")) {
        confidence = 78;
        priority = "Medium";
        activity = "Interactive Quiz";
      } else if (current.topic.includes("Real")) {
        confidence = 72;
        priority = "Low";
        activity = "Video Lesson + Quiz";
      }

      acc.push({
        topic: current.topic,
        activity,
        confidence,
        priority,
        students: [current.student_name],
        ids: [current.id]
      });
    }
    return acc;
  }, []);

  const filteredRecs = groupedRecommendations.filter((rec: any) => filterTopic === "All Topics" || rec.topic === filterTopic);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading AI recommendations...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--danger)" }}>
        <h3>Recommendations Offline</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
        <MetricCard 
          title="New Recommendations" 
          value="12" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          trend={{ value: "3", isPositive: true, label: "vs last 7 days" }}
        />
        <MetricCard 
          title="Students Needing Support" 
          value="18" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          iconBgColor="rgba(245, 34, 61, 0.1)"
          iconColor="var(--danger)"
          trend={{ value: "4", isPositive: false, label: "vs last 7 days" }}
        />
        <MetricCard 
          title="Suggested Activities" 
          value="28" 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>}
          iconBgColor="rgba(101, 61, 245, 0.1)"
          iconColor="var(--purple)"
          trend={{ value: "Across all topics", isPositive: true, label: "" }} // Mocking subtitle
        />
        <MetricCard 
          title="Accepted Recommendations" 
          value={acceptedCount.toString()} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          iconBgColor="rgba(24, 182, 91, 0.1)"
          iconColor="var(--success)"
          trend={{ value: "8", isPositive: true, label: "vs last 7 days" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Left Column: AI Recommendations Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <ChartCard 
            title="✨ AI Recommendations" 
            subtitle="Personalized suggestions based on performance, risk, and learning patterns"
            headerAction={
              <FilterBar 
                filters={[
                  {
                    label: "Topic",
                    value: filterTopic,
                    options: [
                      { label: "All Topics", value: "All Topics" },
                      { label: "Linear Equations", value: "Linear Equations" },
                      { label: "Percentage", value: "Percentage" },
                      { label: "Real Numbers", value: "Real Numbers" }
                    ],
                    onChange: setFilterTopic
                  }
                ]}
              />
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {filteredRecs.map((rec: any, idx: number) => (
                <div key={idx} style={{
                  padding: "20px",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  backgroundColor: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--navy-950)", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                        {rec.topic} Remediation
                        <StatusBadge status={rec.priority} />
                      </h3>
                      <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          Target Students: <strong style={{ color: "var(--navy-950)" }}>{rec.students.length} students</strong>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          Confidence: <strong style={{ color: "var(--navy-950)" }}>{rec.confidence}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ backgroundColor: "var(--surface-muted)", padding: "16px", borderRadius: "8px", fontSize: "14px", color: "var(--text-primary)" }}>
                    <strong style={{ color: "var(--navy-950)" }}>Rationale:</strong> Multiple students ({rec.students.join(", ")}) are showing difficulty solving problems relating to {rec.topic.toLowerCase()}.
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Recommended Activity: <strong style={{ color: "var(--navy-950)" }}>{rec.activity}</strong>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
                        type="button"
                        onClick={() => handleDismiss(rec.ids[0])}
                      >
                        Dismiss
                      </button>
                      <button
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
                        type="button"
                        onClick={() => handleAssign(rec.topic)}
                      >
                        Assign Activity
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredRecs.length === 0 && (
                <EmptyState 
                  title="No Recommendations" 
                  description="Classroom learning is fully optimized for this topic!" 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                />
              )}
            </div>
          </ChartCard>
        </div>

        {/* Right Column: Implementation History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <ChartCard 
            title="Implementation History" 
            subtitle="Recently accepted recommendations"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {[
                { title: "Fractions Review", date: "2 days ago", type: "Assigned Quiz", impact: "+12% avg score" },
                { title: "Basic Algebra", date: "5 days ago", type: "Video Lesson", impact: "+8% completion" },
                { title: "Geometry Basics", date: "1 week ago", type: "Interactive Practice", impact: "+15% engagement" }
              ].map((history, idx) => (
                <div key={idx} style={{ display: "flex", gap: "12px", borderBottom: idx === 2 ? "none" : "1px solid var(--border)", paddingBottom: idx === 2 ? 0 : "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(24, 182, 91, 0.1)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", margin: "0 0 4px 0" }}>{history.title}</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 8px 0" }}>
                      {history.type} • {history.date}
                    </p>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--success)", backgroundColor: "rgba(24, 182, 91, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      Impact: {history.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
