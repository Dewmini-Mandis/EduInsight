import React, { useState, useEffect } from "react";
import LessonRow from "./LessonRow";

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

interface LessonTableProps {
  lessons: any[];
  isReadOnly?: boolean;
  onEdit: (lessonId: number) => void;
  onDelete: (lessonId: number) => void;
}

const LessonTable: React.FC<LessonTableProps> = ({ lessons, isReadOnly, onEdit, onDelete }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div style={{
      marginTop: "14px",
      marginLeft: isMobile ? "0" : "64px",
      backgroundColor: "#F7FAFE",
      borderRadius: "12px",
      padding: "14px 16px"
    }}>
      <div style={{
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.5px",
        color: "#3D5E8A",
        marginBottom: "12px"
      }}>
        LESSONS
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isReadOnly={isReadOnly}
            onEdit={() => onEdit(lesson.id)}
            onDelete={() => onDelete(lesson.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default LessonTable;
