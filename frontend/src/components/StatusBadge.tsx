import React from "react";

type StatusType = 
  | "success" 
  | "warning" 
  | "danger" 
  | "info" 
  | "neutral"
  // Specific mappings for screenshots
  | "High Risk" 
  | "Moderate Risk" 
  | "Low Risk"
  | "Critical"
  | "High"
  | "Moderate"
  | "Medium"
  | "Low"
  | "Active"
  | "Pending";

interface StatusBadgeProps {
  status: StatusType;
  label?: string; // Optional custom label if different from status
  dot?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, dot = false }) => {
  let bgColor = "var(--surface-muted)";
  let textColor = "var(--text-secondary)";

  switch (status) {
    case "success":
    case "Low Risk":
    case "Low":
    case "Active":
      bgColor = "rgba(24, 182, 91, 0.1)";
      textColor = "var(--success)";
      break;
    case "warning":
    case "Moderate Risk":
    case "Moderate":
    case "Medium":
    case "Pending":
      bgColor = "rgba(255, 153, 0, 0.1)";
      textColor = "var(--warning)";
      break;
    case "danger":
    case "High Risk":
    case "High":
    case "Critical":
      bgColor = "rgba(245, 34, 61, 0.1)";
      textColor = "var(--danger)";
      break;
    case "info":
      bgColor = "rgba(20, 99, 243, 0.1)";
      textColor = "var(--blue-600)";
      break;
    default:
      bgColor = "var(--surface-muted)";
      textColor = "var(--text-secondary)";
      break;
  }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "16px",
      backgroundColor: bgColor,
      color: textColor,
      fontSize: "12px",
      fontWeight: "600",
      whiteSpace: "nowrap"
    }}>
      {dot && (
        <span style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: textColor,
          marginRight: "6px"
        }} />
      )}
      {label || status}
    </span>
  );
};

export default StatusBadge;
