import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    label: string;
  };
  infoTooltip?: string;
  iconBgColor?: string;
  iconColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend,
  infoTooltip,
  iconBgColor = "var(--blue-100)",
  iconColor = "var(--blue-600)"
}) => {
  return (
    <div style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <h3 style={{ 
            fontSize: "14px", 
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
      </div>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: iconBgColor,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "16px"
        }}>
          {icon}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--navy-950)", lineHeight: 1 }}>
            {value}
          </div>
          {trend && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "12px" }}>
              <span style={{ 
                color: trend.isPositive ? "var(--success)" : "var(--danger)",
                display: "flex",
                alignItems: "center",
                fontWeight: "600"
              }}>
                {trend.isPositive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                )}
                {trend.value}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
