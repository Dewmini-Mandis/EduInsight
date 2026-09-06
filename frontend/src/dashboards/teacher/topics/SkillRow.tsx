import React, { useState } from "react";
import { GripVertical, X } from "lucide-react";

interface SkillRowProps {
  skill: {
    id: number;
    name: string;
  };
  onRemove: (id: number) => void;
}

const SkillRow: React.FC<SkillRowProps> = ({ skill, onRemove }) => {
  const [hoverRemove, setHoverRemove] = useState(false);

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #DCE6F3",
      borderRadius: "9px",
      minHeight: "54px", // using minHeight to support long text wrapping
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
      gap: "12px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, overflow: "hidden" }}>
        <GripVertical size={18} style={{ color: "#6F8DB8", cursor: "grab", flexShrink: 0 }} />
        <span style={{ 
          fontSize: "14px", 
          fontWeight: "600", 
          color: "#0B1F3A",
          lineHeight: "1.4",
          wordBreak: "break-word"
        }}>
          {skill.name}
        </span>
      </div>
      
      <button
        onClick={() => onRemove(skill.id)}
        onMouseEnter={() => setHoverRemove(true)}
        onMouseLeave={() => setHoverRemove(false)}
        style={{
          background: "none",
          border: "none",
          padding: "4px",
          cursor: "pointer",
          color: hoverRemove ? "#E9283A" : "#7D96B8",
          transition: "color 150ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
        title="Remove skill"
      >
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default SkillRow;
