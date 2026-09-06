import React, { useState, useEffect } from "react";
import { BookOpen, ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface LessonTopicHeaderProps {
  lessonTitle: string;
  onAddTopic: () => void;
}

const LessonTopicHeader: React.FC<LessonTopicHeaderProps> = ({ lessonTitle, onAddTopic }) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [hoverBack, setHoverBack] = useState(false);
  const [hoverAdd, setHoverAdd] = useState(false);

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      border: "1px solid #E4ECF6",
      borderRadius: "16px",
      boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: isMobile ? "20px" : "0",
      marginBottom: "24px"
    }}>
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "#EAF3FF",
          color: "#126BFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
          <BookOpen size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
            Manage Topics & Skills
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
            Lesson: <span style={{ fontWeight: "600", color: "#3D5E8A" }}>{lessonTitle || "Loading..."}</span>
          </p>
        </div>
      </div>

      {/* Right side */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        width: isMobile ? "100%" : "auto",
        flexDirection: isMobile ? "column" : "row"
      }}>
        <button
          onClick={() => navigate("/teacher/lessons")}
          onMouseEnter={() => setHoverBack(true)}
          onMouseLeave={() => setHoverBack(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            height: "42px",
            padding: "0 18px",
            backgroundColor: hoverBack ? "#EEF4FB" : "#F6F9FD",
            border: `1px solid ${hoverBack ? "#C8D8EB" : "#DCE6F3"}`,
            borderRadius: "9px",
            color: "#3D5E8A",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 150ms ease",
            width: isMobile ? "100%" : "auto"
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Back to Lessons
        </button>

        <button
          onClick={onAddTopic}
          onMouseEnter={() => setHoverAdd(true)}
          onMouseLeave={() => setHoverAdd(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            height: "42px",
            padding: "0 20px",
            background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)",
            border: "none",
            borderRadius: "9px",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
            transform: hoverAdd ? "translateY(-1px)" : "none",
            filter: hoverAdd ? "brightness(0.95)" : "none",
            transition: "all 150ms ease",
            width: isMobile ? "100%" : "auto"
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add New Topic
        </button>
      </div>
    </div>
  );
};

export default LessonTopicHeader;
