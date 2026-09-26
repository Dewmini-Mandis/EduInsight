import React, { useState } from "react";
import { getToken } from "../../auth/authUtils";

interface InterventionModalProps {
  studentId: number;
  studentName: string;
  skillId?: number;
  skillName?: string;
  quizId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const InterventionModal: React.FC<InterventionModalProps> = ({
  studentId,
  studentName,
  skillId,
  skillName,
  quizId,
  onClose,
  onSuccess
}) => {
  const [interventionType, setInterventionType] = useState("1ON1");
  const [outcome, setOutcome] = useState("IMPROVED");
  const [notes, setNotes] = useState("");
  const [grantExtraAttempt, setGrantExtraAttempt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const token = getToken();

    try {
      // 1. Record Intervention
      const intRes = await fetch("/api/attempts/interventions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          student: studentId,
          skill: skillId || 1,
          intervention_type: interventionType,
          outcome: outcome,
          notes: notes
        })
      });

      if (!intRes.ok) {
        const errData = await intRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to record intervention.");
      }

      // 2. Grant Override if requested
      if (grantExtraAttempt && quizId) {
        await fetch("/api/attempts/overrides/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`
          },
          body: JSON.stringify({
            student: studentId,
            quiz: quizId,
            override_type: "EXTRA_ATTEMPT",
            new_value: "1",
            reason: `Granted via intervention: ${notes || "Teacher approval"}`
          })
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit intervention.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", padding: "28px", borderRadius: "12px", width: "480px", maxWidth: "90%", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px", fontWeight: "700" }}>Record Teacher Intervention</h3>
        <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px" }}>
          Target Student: <strong>{studentName}</strong> {skillName ? `| Skill: ${skillName}` : ""}
        </p>

        {error && <div style={{ padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>Intervention Type *</label>
            <select value={interventionType} onChange={(e) => setInterventionType(e.target.value)} style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}>
              <option value="1ON1">1-on-1 Consultation Session</option>
              <option value="EXTRA_PRACTICE">Extra Practice / Targeted Worksheets</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>Observed Outcome *</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}>
              <option value="IMPROVED">Improved (Student demonstrates concept mastery)</option>
              <option value="STABLE">Stable (Moderate progress observed)</option>
              <option value="STILL_STRUGGLING">Still Struggling (Requires additional support)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>Teacher Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record specific diagnostic notes or guidance provided..."
              rows={3}
              style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {quizId && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <input
                type="checkbox"
                id="grantOverride"
                checked={grantExtraAttempt}
                onChange={(e) => setGrantExtraAttempt(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="grantOverride" style={{ fontSize: "13px", fontWeight: "500", color: "#1e293b", cursor: "pointer" }}>
                Unlock 1 Teacher-Approved Extra Attempt for this Quiz
              </label>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 16px", background: "none", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "9px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : "Save Intervention"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterventionModal;
