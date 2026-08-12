import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  subtitle,
  infoTooltip, 
  headerAction, 
  children,
  footer
}) => {
  return (
    <div style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      height: "100%"
    }}>
      <div style={{ 
        padding: "20px 20px 16px 20px",
        display: "flex", 
        alignItems: "flex-start", 
        justifyContent: "space-between",
        borderBottom: footer ? "none" : undefined
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ 
              fontSize: "16px", 
              fontWeight: "600", 
              color: "var(--navy-950)", 
              margin: 0 
            }}>
              {title}
            </h3>
            {infoTooltip && (
              <div title={infoTooltip} style={{ color: "var(--text-muted)", cursor: "help", display: "flex" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && (
          <div>
            {headerAction}
          </div>
        )}
      </div>
      
      <div style={{ padding: "0 20px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {footer && (
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--surface-muted)",
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px"
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default ChartCard;
