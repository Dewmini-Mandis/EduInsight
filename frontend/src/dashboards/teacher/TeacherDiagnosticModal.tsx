import React, { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle, Clock, BookOpen, User, FileText, Activity } from "lucide-react";
import { getToken } from "../../auth/authUtils";

interface TeacherDiagnosticModalProps {
  studentId: number;
  quizId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface DiagnosticData {
  student_info: { id: number; name: string; email: string; grade: string };
  quiz_info: { id: number; title: string; pass_mark: number; max_attempts: number };
  ordinary_attempts: Array<{ id: number; attempt_number: number; score: number; start_time: string; status: string }>;
  reassessment_attempt: { id: number; attempt_number: number; score: number; start_time: string; status: string } | null;
  weak_skills: Array<{ id: number; name: string }>;
  risk_prediction: { level: string; probability: number; factors: string[] } | null;
  shap_explanation_factors: Array<{ feature_name: string; impact: number; description: string }>;
  remediation_materials: Array<{ id: number; title: string; material_type: string; is_completed: boolean }>;
  remediation_all_completed: boolean;
  remediation_state: string;
  pending_intervention: { id: number; notes: string; is_pending: boolean } | null;
}

const TeacherDiagnosticModal: React.FC<TeacherDiagnosticModalProps> = ({
  studentId,
  quizId,
  onClose,
  onSuccess,
}) => {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState("");
  const [interventionType, setInterventionType] = useState("1ON1");
  const [outcome, setOutcome] = useState("IMPROVED");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDiagnostic = async () => {
      setLoading(true);
      setError("");
      const token = getToken();
      try {
        const res = await fetch(`/api/attempts/attempts/teacher_diagnostic/?student=${studentId}&quiz=${quizId}`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) {
          throw new Error("Failed to load diagnostic evidence.");
        }
        const diagData = await res.json();
        setData(diagData);
        if (diagData.pending_intervention?.notes) {
          setNotes(diagData.pending_intervention.notes);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load diagnostic evidence.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostic();
  }, [studentId, quizId]);

  const handleSubmitIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = getToken();

    try {
      const res = await fetch("/api/attempts/interventions/record/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          student: studentId,
          quiz: quizId,
          intervention_id: data?.pending_intervention?.id,
          notes,
          intervention_type: interventionType,
          outcome,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to record intervention.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to submit intervention.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", color: "#334155" }}>Loading diagnostic evidence...</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "white", borderRadius: "16px", width: "700px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={22} color="#2563EB" />
              Diagnostic Evidence & Escalation Review
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
              Student: <strong>{data?.student_info.name}</strong> • Quiz: <strong>{data?.quiz_info.title}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", padding: "4px" }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {error ? (
          <div style={{ padding: "12px", background: "#FEF2F2", color: "#991B1B", borderRadius: "8px" }}>{error}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. Ordinary Attempts Breakdown */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: "700", color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={16} color="#2563EB" />
                Ordinary Attempts History (Pass Threshold: {data?.quiz_info.pass_mark}%)
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {data?.ordinary_attempts.map((att) => (
                  <div key={att.id} style={{ background: "white", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "10px 14px", flex: "1", minWidth: "140px" }}>
                    <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "600" }}>Attempt #{att.attempt_number}</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: att.score >= (data?.quiz_info.pass_mark || 50) ? "#16B978" : "#DC2626" }}>
                      {att.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Weak Skills & SHAP Factors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "12px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "700", color: "#92400E" }}>
                  Identified Weak Skills
                </h4>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#78350F" }}>
                  {data?.weak_skills.map((sk) => (
                    <li key={sk.id}>{sk.name}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "700", color: "#1E40AF" }}>
                  ML SHAP Explanation Factors
                </h4>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#1E3A8A" }}>
                  {data?.shap_explanation_factors.map((f, i) => (
                    <li key={i}>{f.feature_name}: {f.description}</li>
                  ))}
                  {(!data?.shap_explanation_factors || data.shap_explanation_factors.length === 0) && (
                    <li>No anomalous risk factors flagged.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* 3. Remediation & Reassessment Results */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: "700", color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={16} color="#16B978" />
                Remediation Completion & Post-Remedial Reassessment
              </h3>

              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "8px" }}>
                Required Materials Completion Status: <strong>{data?.remediation_all_completed ? "100% Completed" : "Incomplete"}</strong>
              </div>

              {data?.reassessment_attempt && (
                <div style={{ background: "white", border: "1.5px solid #DC2626", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#991B1B" }}>
                    Post-Remedial Reassessment Score: {data.reassessment_attempt.score}% (Pass Mark: {data.quiz_info.pass_mark}%)
                  </div>
                  <div style={{ fontSize: "12px", color: "#7F1D1D", marginTop: "2px" }}>
                    Reassessment status: FAILED. Pending teacher intervention required.
                  </div>
                </div>
              )}
            </div>

            {/* 4. Interactive Intervention Form */}
            <form onSubmit={handleSubmitIntervention} style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#0F172A" }}>
                Record Teacher Intervention & Guidance
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Intervention Type *
                  </label>
                  <select
                    value={interventionType}
                    onChange={(e) => setInterventionType(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                  >
                    <option value="1ON1">1-on-1 Consultation Session</option>
                    <option value="EXTRA_PRACTICE">Extra Practice / Targeted Worksheet</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Observed Outcome *
                  </label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                  >
                    <option value="IMPROVED">Improved (Demonstrates Concept Mastery)</option>
                    <option value="STABLE">Stable (Moderate Progress Observed)</option>
                    <option value="STILL_STRUGGLING">Still Struggling (Further Support Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Diagnostic Notes & Intervention Record *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder="Record diagnostic findings, misconceptions addressed, and intervention outcome..."
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "white", fontSize: "13px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "#2563EB", color: "white", fontSize: "13px", fontWeight: "600", cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Saving..." : "Record Completed Intervention"}
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherDiagnosticModal;
