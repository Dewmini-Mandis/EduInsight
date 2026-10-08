import React, { useState } from "react";
import { Edit2, Trash2, Layers } from "lucide-react";

interface LessonActionsProps {
  isReadOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const LessonActions: React.FC<LessonActionsProps> = ({ isReadOnly, onEdit, onDelete }) => {
  const [hoverBtn, setHoverBtn] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);

  if (isReadOnly) {
    return (
      <button
        type="button"
        onClick={onEdit}
        onMouseEnter={() => setHoverBtn(true)}
        onMouseLeave={() => setHoverBtn(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          height: "36px",
          padding: "0 14px",
          borderRadius: "7px",
          backgroundColor: hoverBtn ? "#F0F5FD" : "#FFFFFF",
          border: "1px solid #DCE6F3",
          color: "#3D5E8A",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
      >
        <Layers size={14} strokeWidth={2} color="#5D78A3" />
        Skills
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <button
        type="button"
        onClick={onEdit}
        onMouseEnter={() => setHoverBtn(true)}
        onMouseLeave={() => setHoverBtn(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          height: "36px",
          padding: "0 12px",
          borderRadius: "7px",
          backgroundColor: hoverBtn ? "#EEF5FF" : "#FFFFFF",
          border: "1px solid #126BFF",
          color: "#126BFF",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
      >
        <Edit2 size={14} strokeWidth={2.5} />
        Edit
      </button>

      <button
        type="button"
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
          transition: "background-color 150ms ease",
        }}
      >
        <Trash2 size={14} strokeWidth={2.5} />
        Delete
      </button>
    </div>
  );
};

export default LessonActions;
