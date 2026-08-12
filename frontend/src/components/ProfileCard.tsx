import React from "react";

interface ProfileCardProps {
  name: string;
  role: string;
  email: string;
  initials: string;
  details: { label: string; value: string }[];
}

const ProfileCard: React.FC<ProfileCardProps> = ({ name, role, email, initials, details }) => {
  return (
    <div style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center"
    }}>
      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        backgroundColor: "var(--blue-100)",
        color: "var(--blue-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        fontWeight: "700",
        marginBottom: "16px"
      }}>
        {initials}
      </div>
      
      <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--navy-950)", margin: "0 0 4px 0" }}>
        {name}
      </h2>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 4px 0" }}>
        {role}
      </p>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 24px 0" }}>
        {email}
      </p>
      
      <div style={{ width: "100%", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        {details.map((detail, idx) => (
          <div key={idx} style={{ 
            display: "flex", 
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: idx === details.length - 1 ? "none" : "1px solid var(--border)"
          }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{detail.label}</span>
            <span style={{ color: "var(--navy-950)", fontSize: "13px", fontWeight: "600" }}>{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileCard;
