import React from "react";
import { ArrowLeft, LucideIcon } from "lucide-react";

interface LearningNoteHeaderProps {
  onBack: () => void;
  title: string;
  subtitle: string;
  helperText: string;
  icon: LucideIcon;
}

const LearningNoteHeader: React.FC<LearningNoteHeaderProps> = ({ onBack, title, subtitle, helperText, icon: Icon }) => {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          color: "#0B1F3A", 
          margin: "0 0 4px 0",
          lineHeight: "1.2" 
        }}>
          {title}
        </h1>
        <p style={{ 
          fontSize: "15px", 
          fontWeight: "400", 
          color: "#5D78A3", 
          margin: 0 
        }}>
          {subtitle}
        </p>
      </div>

      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#EAF3FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Icon size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
              {title}
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              {helperText}
            </p>
          </div>
        </div>

        <button 
          onClick={onBack} 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            gap: "6px", 
            background: "#F7FAFE", 
            border: "1px solid #DCE6F3", 
            color: "#3D5E8A", 
            fontSize: "14px", 
            fontWeight: "600", 
            cursor: "pointer", 
            height: "40px",
            padding: "0 16px", 
            borderRadius: "8px", 
            transition: "all 0.2s" 
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} /> Back
        </button>
      </div>
    </div>
  );
};

export default LearningNoteHeader;
