import React, { useState, useEffect } from "react";
import LessonActions from "./LessonActions";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
};

interface LessonRowProps {
  lesson: any;
  isReadOnly?: boolean;
  onManageSkills: () => void;
  onDelete: () => void;
}

const LessonRow: React.FC<LessonRowProps> = ({ lesson, isReadOnly, onManageSkills, onDelete }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #DCE6F3",
      borderRadius: "9px",
      minHeight: "54px",
      padding: "10px 14px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      marginBottom: "8px",
      gap: "12px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ 
            fontSize: "14px", 
            fontWeight: "600", 
            color: "#0B1F3A",
            lineHeight: "1.4"
          }}>
            {lesson.title}
          </span>
          {lesson.description && (
            <span style={{ 
              fontSize: "13px", 
              color: "#5D78A3",
              lineHeight: "1.4",
              marginTop: "2px"
            }}>
              {lesson.description}
            </span>
          )}
        </div>
      </div>
      
      <div style={{ 
        display: "flex", 
        justifyContent: isMobile ? "flex-end" : "flex-end",
        width: isMobile ? "100%" : "auto" 
      }}>
        <LessonActions isReadOnly={isReadOnly} onManageSkills={onManageSkills} onDelete={onDelete} />
      </div>
    </div>
  );
};

export default LessonRow;
