import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, actionLabel, onAction }) => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "64px 24px",
      textAlign: "center",
      backgroundColor: "var(--surface)",
      borderRadius: "12px",
      border: "1px dashed var(--border)"
    }}>
      {icon && (
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "var(--blue-100)",
          color: "var(--blue-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px"
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: "18px",
        fontWeight: "600",
        color: "var(--navy-950)",
        margin: "0 0 8px 0"
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: "14px",
        color: "var(--text-secondary)",
        margin: "0 0 24px 0",
        maxWidth: "400px"
      }}>
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
      {!action && actionLabel && (
        <button 
          onClick={onAction}
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--blue-600)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: onAction ? "pointer" : "default",
            fontWeight: "500",
            fontSize: "14px"
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
