import React, { useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface TermSyllabusCardProps {
  title: string;
  subtitle: string;
  lessonCount: number;
  children: React.ReactNode;
}

const TermSyllabusCard: React.FC<TermSyllabusCardProps> = ({
  title,
  subtitle,
  lessonCount,
  children
}) => {
  const [expanded, setExpanded] = useState(true);

  // Determine colors based on title (e.g., "Term 1", "Term 2")
  let colorTheme = {
    bg: "#EAF3FF",
    text: "#126BFF"
  };

  if (title.toLowerCase().includes("term 2")) {
    colorTheme = {
      bg: "#E9FBF4",
      text: "#16B978"
    };
  } else if (title.toLowerCase().includes("term 3")) {
    colorTheme = {
      bg: "#F3ECFF",
      text: "#7C3AED"
    };
  }

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      border: "1px solid #E4ECF6",
      borderRadius: "16px",
      boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
      padding: "18px",
      marginBottom: "20px"
    }}>
      {/* Header */}
      <div 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            backgroundColor: colorTheme.bg,
            color: colorTheme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Calendar size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
              {title}
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            padding: "7px 12px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            backgroundColor: colorTheme.bg,
            color: colorTheme.text
          }}>
            {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
          </div>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#0B1F3A", display: "flex" }}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div style={{ marginTop: "24px" }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default TermSyllabusCard;
