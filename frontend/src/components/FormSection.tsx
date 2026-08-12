import React from "react";

interface FormSectionProps {
  title: string;
  stepNumber?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, stepNumber, icon, children, headerAction }) => {
  return (
    <div style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      marginBottom: "24px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
    }}>
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {(stepNumber !== undefined || icon) && (
            <div style={{
              color: "var(--blue-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {icon ? icon : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              )}
            </div>
          )}
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--navy-950)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {stepNumber !== undefined && <span>{stepNumber}.</span>}
            {title}
          </h3>
        </div>
        {headerAction && (
          <div>
            {headerAction}
          </div>
        )}
      </div>
      <div style={{ padding: "24px" }}>
        {children}
      </div>
    </div>
  );
};

export default FormSection;
