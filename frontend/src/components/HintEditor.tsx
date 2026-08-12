import React from "react";

interface HintEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxLength?: number;
}

const HintEditor: React.FC<HintEditorProps> = ({ value, onChange, placeholder = "Type here...", maxLength = 150 }) => {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "var(--surface)"
    }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "12px",
          border: "none",
          outline: "none",
          resize: "vertical",
          fontFamily: "var(--font-primary)",
          fontSize: "14px",
          color: "var(--text-primary)"
        }}
      />
      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center"
      }}>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
};

export default HintEditor;
