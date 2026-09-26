import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import FilterBar from "../../components/FilterBar";
import InterventionModal from "./InterventionModal";

type RiskAlert = {
  id: number;
  student_id: number;
  student_name: string;
  student_class: string;
  skill_id?: number;
  skill_name?: string;
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
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

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
        const name = a.student_name || `Student #${a.student}`;
        const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
        
        let trigger_reason = "No data";
        if (a.contributing_factors && Object.keys(a.contributing_factors).length > 0) {
          const keys = Object.keys(a.contributing_factors).slice(0, 3);
          trigger_reason = keys.map(k => `${k}: ${a.contributing_factors[k]}`).join(", ");
        }

        return {
          id: a.id,
          student_id: a.student,
          student_name: name,
          initials,
          skill_id: a.skill,
          skill_name: a.skill_name || "",
          student_class: a.student_class || "Grade 10",
          topic_lesson: a.topic_lesson || "-",
          risk_category: "Performance",
          severity: a.risk_category === "High Risk" ? "High" : "Moderate",
          trigger_reason: trigger_reason,
          last_updated: a.prediction_date ? new Date(a.prediction_date).toLocaleDateString() : ""
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
    return filterSeverity === "All Risk Levels" || alert.severity === filterSeverity;
  });

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
      header: "Topic / Skill",
      render: (item) => <span>{item.skill_name || item.topic_lesson}</span>
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
      header: "Trigger Factors",
      render: (item) => <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{item.trigger_reason}</span>
    },
    {
      key: "action",
      header: "Action",
      render: (item) => (
        <button 
          onClick={() => setSelectedAlert(item)}
          style={{ 
            backgroundColor: "var(--blue-600)", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            padding: "6px 12px", 
            fontSize: "12px", 
            fontWeight: "500", 
            cursor: "pointer" 
          }}
        >
          Intervene
        </button>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <FilterBar 
        filters={[
          {
            label: "Severity",
            value: filterSeverity,
            options: [
              { label: "All Risk Levels", value: "All Risk Levels" },
              { label: "High", value: "High" },
              { label: "Moderate", value: "Moderate" },
              { label: "Low", value: "Low" }
            ],
            onChange: setFilterSeverity
          }
        ]}
      />

      <ChartCard title="Risk Alerts" subtitle="AI-identified students requiring academic intervention">
        <div style={{ margin: "0 -20px" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Loading risk alerts...</div>
          ) : (
            <DataTable columns={columns} data={filteredAlerts} keyExtractor={(item) => item.id} />
          )}
        </div>
      </ChartCard>

      {selectedAlert && (
        <InterventionModal
          studentId={selectedAlert.student_id}
          studentName={selectedAlert.student_name}
          skillId={selectedAlert.skill_id}
          skillName={selectedAlert.skill_name}
          onClose={() => setSelectedAlert(null)}
          onSuccess={() => {
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
};

export default RiskAlerts;
