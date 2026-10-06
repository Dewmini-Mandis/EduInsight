import React from "react";
import { CheckCircle2, X } from "lucide-react";

interface SuccessBannerProps {
  message: string;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({ message, onClose, style }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "14px 18px",
        backgroundColor: "#ECFDF5",
        border: "1px solid #A7F3D0",
        color: "#047857",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.12)",
        transition: "all 0.2s ease",
        ...style
      }}
    >
      <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          style={{
            background: "none",
            border: "none",
            color: "#047857",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px",
            borderRadius: "4px"
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SuccessBanner;
