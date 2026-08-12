import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import FilterBar from "../../components/FilterBar";

type RiskAlert = {
  id: number;
  student_name: string;
  student_class: string;
  topic_lesson: string;
  risk_category: string;
  severity: "Critical" | "High" | "Moderate" | "Low";
  trigger_reason: string;
  last_updated: string;
  initials: string;
};

const RiskAlerts = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All Risk Levels");
  const [filterCategory, setFilterCategory] = useState("All Categories");

  const fetchAlerts = async () => {
    const token = getToken();
    if (!token) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/analytics/risk/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Could not load risk alerts.");
      const data = await res.json() as any[];
      
      const mappedData: RiskAlert[] = data.map(a => {
        const name = a.student_name || "Unknown";
        const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
        
        let trigger_reason = "No data";
        if (a.contributing_factors && Object.keys(a.contributing_factors).length > 0) {
            trigger_reason = JSON.stringify(a.contributing_factors);
        }

        return {
          id: a.id,
          student_name: name,
          initials,
          student_class: a.student_class || "Grade 10",
          topic_lesson: a.topic_lesson || "-",
          risk_category: "Performance",
          severity: a.risk_category || "Moderate",
          trigger_reason: trigger_reason,
          last_updated: a.prediction_date
        };
      });

      setAlerts(mappedData);
    } catch (err: any) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === "All Risk Levels" || alert.severity === filterSeverity;
    const matchesCategory = filterCategory === "All Categories" || alert.risk_category === filterCategory;
    return matchesSeverity && matchesCategory;
  });

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Syncing warning alerts...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--danger)" }}>
        <h3>Alerts Offline</h3>
        <p>{error}</p>
      </div>
    );
  }

  const columns: Column<RiskAlert>[] = [
    {
      key: "student_name",
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
          <span style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.student_name}</span>
        </div>
      )
    },
    {
      key: "student_class",
      header: "Class"
    },
    {
      key: "topic_lesson",
      header: "Topic / Lesson"
    },
    {
      key: "risk_category",
      header: "Category",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.risk_category}</span>
    },
    {
      key: "severity",
      header: "Severity",
      render: (item) => <StatusBadge status={item.severity} dot />
    },
    {
      key: "trigger_reason",
      header: "Trigger Reason",
      render: (item) => <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{item.trigger_reason}</span>
    },
    {
      key: "action",
      header: "Action",
      render: () => (
        <button style={{ 
          backgroundColor: "var(--blue-600)", 
          color: "white", 
          border: "none", 
          borderRadius: "6px", 
          padding: "6px 12px", 
          fontSize: "12px", 
          fontWeight: "500", 
          cursor: "pointer" 
        }}>
          Intervene
        </button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <FilterBar 
        filters={[
          {
            label: "Severity",
            value: filterSeverity,
            options: [
              { label: "All Risk Levels", value: "All Risk Levels" },
              { label: "Critical", value: "Critical" },
              { label: "High", value: "High" },
              { label: "Moderate", value: "Moderate" },
              { label: "Low", value: "Low" }
            ],
            onChange: setFilterSeverity
          },
          {
            label: "Category",
            value: filterCategory,
            options: [
              { label: "All Categories", value: "All Categories" },
              { label: "Performance", value: "Performance" },
              { label: "Engagement", value: "Engagement" },
              { label: "Understanding", value: "Understanding" }
            ],
            onChange: setFilterCategory
          }
        ]}
        onExport={() => {
            const csvContent = "data:text/csv;charset=utf-8," + 
                "Student Name,Class,Topic/Lesson,Risk Category,Severity,Trigger Reason\n" +
                filteredAlerts.map(a => `${a.student_name},${a.student_class},${a.topic_lesson},${a.risk_category},${a.severity},"${a.trigger_reason}"`).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "risk_alerts.csv");
            document.body.appendChild(link);
            link.click();
        }}
      />

      <ChartCard 
        title="Active Risk Alerts" 
        subtitle="Students flagged by AI as requiring intervention"
      >
        <div style={{ margin: "0 -20px" }}>
          <DataTable 
            columns={columns} 
            data={filteredAlerts} 
            keyExtractor={(a) => a.id} 
          />
        </div>
      </ChartCard>
    </div>
  );
};

export default RiskAlerts;
