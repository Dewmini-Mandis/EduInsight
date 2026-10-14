import React from "react";
import { HelpCircle } from "lucide-react";
import "../../../styles/student.css";

interface ProgressSummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  tooltipText?: string;
}

const ProgressSummaryCard: React.FC<ProgressSummaryCardProps> = ({
  label,
  value,
  icon,
  iconBg,
  tooltipText,
}) => {
  return (
    <div className="student-metric-card" style={{ position: "relative", flex: 1, padding: "20px 22px" }}>
      <div className="student-metric-icon-box" style={{ background: iconBg, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="student-metric-label">{label}</span>
          {tooltipText && (
            <span
              title={tooltipText}
              style={{ cursor: "help", display: "inline-flex", alignItems: "center" }}
            >
              <HelpCircle size={13} color="#9AAAC1" />
            </span>
          )}
        </div>
        <div className="student-metric-value" style={{ fontSize: "24px", marginTop: "2px" }}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default ProgressSummaryCard;
