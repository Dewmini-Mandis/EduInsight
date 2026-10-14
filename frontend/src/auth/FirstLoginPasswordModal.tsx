import React, { useState } from "react";
import { getToken } from "./authUtils";

interface Props {
  onSuccess: () => void;
}

const FirstLoginPasswordModal: React.FC<Props> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    const token = getToken();

    try {
      const res = await fetch("/api/accounts/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update password.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "420px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#1e293b", fontSize: "20px", fontWeight: "700" }}>Change Temporary Password</h3>
        <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px", lineHeight: "1.5" }}>
          For security reasons, you must set a new permanent password before accessing EduInsight.
        </p>

        {error && <div style={{ padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>New Password *</label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Confirm New Password *</label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: "8px", padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Updating..." : "Set New Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginPasswordModal;
