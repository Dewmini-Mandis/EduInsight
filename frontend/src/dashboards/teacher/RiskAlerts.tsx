import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import FilterBar from "../../components/FilterBar";
import InterventionModal from "./InterventionModal";
import TeacherDiagnosticModal from "./TeacherDiagnosticModal";

type RiskAlert = {
  id: number;
  student_id: number;
  student_name: string;
  student_class: string;
  skill_id?: number;
  skill_name?: string;
  quiz_id?: number;
  topic_lesson: string;
  risk_category: string;
  severity: "Critical" | "High" | "Moderate" | "Low";
  trigger_reason: string;
  last_updated: string;
  initials: string;
  is_pending_escalation?: boolean;
};

const RiskAlerts = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All Risk Levels");
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [diagnosticTarget, setDiagnosticTarget] = useState<{ studentId: number; quizId: number } | null>(null);

  const fetchAlerts = async () => {
    const token = getToken();
    if (!token) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/attempts/interventions/pending/", {
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load intervention alerts.");
      }

      const pendingList: any[] = await res.json();

      const mappedData: RiskAlert[] = pendingList.map((p) => {
        const name = p.student_name || `Student #${p.student}`;
        const initials = name
          .split(" ")
          .slice(0, 2)
          .map((n: string) => n[0])
          .join("")
          .toUpperCase();

        const scoreText = p.failed_reassessment_score !== null && p.failed_reassessment_score !== undefined
          ? `${p.failed_reassessment_score}% (Pass: ${p.pass_mark}%)`
          : "Failed";

        const trigger = p.notes || `Failed reassessment (${scoreText})`;

        return {
          id: p.id,
          student_id: p.student,
          student_name: name,
          initials,
          skill_id: p.skill,
          skill_name: p.weak_skill_name || "",
          student_class: p.student_class || "Grade 10",
          topic_lesson: `${p.quiz_title || "Quiz"} - ${p.lesson_title || "Lesson"}`,
          quiz_id: p.quiz,
          risk_category: "Needs Teacher Intervention",
          severity: "Critical",
          trigger_reason: trigger,
          last_updated: p.date_recorded ? new Date(p.date_recorded).toLocaleDateString() : "",
          is_pending_escalation: true,
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
            backgroundColor: item.is_pending_escalation ? "#FEF2F2" : "var(--blue-100)",
            color: item.is_pending_escalation ? "#DC2626" : "var(--blue-600)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: "12px", fontWeight: "600" 
          }}>
            {item.initials}
          </div>
          <div>
            <span style={{ fontWeight: "600", color: "var(--navy-950)", display: "block" }}>{item.student_name}</span>
            {item.is_pending_escalation && (
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#DC2626" }}>
                Reassessment Escalation Pending
              </span>
            )}
          </div>
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
        <div style={{ display: "flex", gap: "8px" }}>
          {item.quiz_id ? (
            <button 
              onClick={() => setDiagnosticTarget({ studentId: item.student_id, quizId: item.quiz_id! })}
              style={{ 
                backgroundColor: item.is_pending_escalation ? "#DC2626" : "#2563EB", 
                color: "white", 
                border: "none", 
                borderRadius: "6px", 
                padding: "6px 12px", 
                fontSize: "12px", 
                fontWeight: "600", 
                cursor: "pointer" 
              }}
            >
              Review Diagnostic & Intervene
            </button>
          ) : (
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
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <FilterBar 
        onClearFilters={() => setFilterSeverity("All Risk Levels")}
        filters={[
          {
            label: "Severity",
            value: filterSeverity,
            defaultValue: "All Risk Levels",
            options: [
              { label: "All Risk Levels", value: "All Risk Levels" },
              { label: "Critical", value: "Critical" },
              { label: "High", value: "High" },
              { label: "Moderate", value: "Moderate" },
              { label: "Low", value: "Low" }
            ],
            onChange: setFilterSeverity
          }
        ]}
      />

      <ChartCard title="Risk & Escalation Alerts" subtitle="AI-identified students & post-remedial reassessment escalations requiring teacher intervention">
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

      {diagnosticTarget && (
        <TeacherDiagnosticModal
          studentId={diagnosticTarget.studentId}
          quizId={diagnosticTarget.quizId}
          onClose={() => setDiagnosticTarget(null)}
          onSuccess={() => {
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
};

export default RiskAlerts;
