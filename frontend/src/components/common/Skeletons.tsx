import React from "react";

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        >
          <div style={{ height: "16px", width: "35%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "24px", width: "75%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
          <div style={{ height: "14px", width: "90%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "14px", width: "60%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ marginTop: "12px", height: "36px", width: "100%", backgroundColor: "#e2e8f0", borderRadius: "6px" }} />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div style={{ width: "100%", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ display: "flex", padding: "16px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", gap: "20px" }}>
        <div style={{ height: "16px", width: "20%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
        <div style={{ height: "16px", width: "25%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
        <div style={{ height: "16px", width: "20%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
        <div style={{ height: "16px", width: "15%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", gap: "20px", alignItems: "center" }}>
          <div style={{ height: "18px", width: "20%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "18px", width: "25%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "18px", width: "20%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "18px", width: "15%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
        </div>
      ))}
    </div>
  );
};

export const StatCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        >
          <div style={{ height: "14px", width: "50%", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
          <div style={{ height: "32px", width: "40%", backgroundColor: "#cbd5e1", borderRadius: "6px" }} />
          <div style={{ height: "12px", width: "65%", backgroundColor: "#f1f5f9", borderRadius: "4px" }} />
        </div>
      ))}
    </div>
  );
};
