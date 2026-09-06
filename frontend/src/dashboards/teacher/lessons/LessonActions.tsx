import React, { useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";

interface LessonActionsProps {
  onManageTopics: () => void;
  onDelete: () => void;
}

const LessonActions: React.FC<LessonActionsProps> = ({ onManageTopics, onDelete }) => {
  const [hoverManage, setHoverManage] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <button
        onClick={onManageTopics}
        onMouseEnter={() => setHoverManage(true)}
        onMouseLeave={() => setHoverManage(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          height: "36px",
          padding: "0 12px",
          borderRadius: "7px",
          backgroundColor: hoverManage ? "#EEF5FF" : "#FFFFFF",
          border: "1px solid #126BFF",
          color: "#126BFF",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 150ms ease"
        }}
      >
        <BookOpen size={14} strokeWidth={2.5} />
        Manage Topics
      </button>

      <button
        onClick={onDelete}
        onMouseEnter={() => setHoverDelete(true)}
        onMouseLeave={() => setHoverDelete(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          height: "36px",
          padding: "0 12px",
          borderRadius: "7px",
          backgroundColor: hoverDelete ? "#FFECEE" : "#FFF5F5",
          border: "1px solid #FFB8BE",
          color: "#FF3347",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 150ms ease"
        }}
      >
        <Trash2 size={14} strokeWidth={2.5} />
        Delete
      </button>
    </div>
  );
};

export default LessonActions;
