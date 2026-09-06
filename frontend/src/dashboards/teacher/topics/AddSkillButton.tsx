import React, { useState } from "react";
import { Plus } from "lucide-react";

interface AddSkillButtonProps {
  isAdding: boolean;
  onStartAdding: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newSkillName: string;
  setNewSkillName: (val: string) => void;
  isSubmitting: boolean;
}

const AddSkillButton: React.FC<AddSkillButtonProps> = ({
  isAdding,
  onStartAdding,
  onCancel,
  onSubmit,
  newSkillName,
  setNewSkillName,
  isSubmitting
}) => {
  const [hover, setHover] = useState(false);

  if (isAdding) {
    return (
      <form 
        onSubmit={onSubmit} 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px", 
          marginTop: "8px",
          width: "100%"
        }}
      >
        <input 
          type="text" 
          style={{ 
            flex: 1,
            height: "42px",
            padding: "0 12px",
            border: "1px solid #DCE6F3",
            borderRadius: "9px",
            fontSize: "14px",
            color: "#0B1F3A",
            outline: "none",
            boxShadow: "inset 0 1px 2px rgba(18, 63, 110, 0.02)"
          }}
          placeholder="Enter new skill name" 
          value={newSkillName} 
          onChange={e => setNewSkillName(e.target.value)} 
          autoFocus
          required 
        />
        <button 
          type="submit" 
          disabled={isSubmitting} 
          style={{ 
            height: "42px",
            padding: "0 16px",
            backgroundColor: "#16B978",
            border: "none",
            borderRadius: "9px",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? "..." : "Save"}
        </button>
        <button 
          type="button" 
          disabled={isSubmitting} 
          onClick={onCancel} 
          style={{ 
            height: "42px",
            padding: "0 16px",
            backgroundColor: "#F6F9FD",
            border: "1px solid #DCE6F3",
            borderRadius: "9px",
            color: "#3D5E8A",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={onStartAdding}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: "44px",
        width: "100%",
        border: `1.5px dashed ${hover ? "#126BFF" : "#8BB8FF"}`,
        background: hover ? "#EEF6FF" : "#F8FBFF",
        borderRadius: "9px",
        color: "#126BFF",
        fontSize: "14px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: "pointer",
        transition: "all 150ms ease"
      }}
    >
      <Plus size={16} strokeWidth={2.5} />
      Add Skill
    </button>
  );
};

export default AddSkillButton;
