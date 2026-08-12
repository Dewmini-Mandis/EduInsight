import React from "react";

interface QuizQuestionCardProps {
  index: number;
  type: string;
  points: number;
  question: string;
  options?: string[];
  expectedAnswer?: string;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  index,
  type,
  points,
  question,
  options,
  expectedAnswer,
  onEdit,
  onCopy,
  onDelete
}) => {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      padding: "16px",
      borderBottom: "1px solid var(--border)",
      gap: "16px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--navy-950)",
        fontWeight: "600",
        flexShrink: 0
      }}>
        {index}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{
            fontSize: "12px",
            fontWeight: "600",
            color: type === "MCQ" ? "var(--purple)" : type === "True / False" ? "var(--blue-600)" : "var(--warning)",
            backgroundColor: type === "MCQ" ? "rgba(101, 61, 245, 0.1)" : type === "True / False" ? "rgba(20, 99, 243, 0.1)" : "rgba(255, 153, 0, 0.1)",
            padding: "2px 8px",
            borderRadius: "4px"
          }}>
            {type}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            | {points} {points === 1 ? 'point' : 'points'}
          </span>
        </div>
        
        <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: "0 0 16px 0", fontWeight: "500" }}>
          {question}
        </p>
        
        {options && options.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {options.map((opt, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: idx === 0 ? "4px solid var(--success)" : "1px solid var(--border)",
                  backgroundColor: "var(--surface)"
                }} />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{opt}</span>
              </div>
            ))}
          </div>
        )}

        {expectedAnswer && (
          <div style={{
            padding: "12px",
            backgroundColor: "var(--surface-muted)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--text-primary)",
            marginTop: "12px"
          }}>
            <span style={{ color: "var(--text-secondary)", marginRight: "8px" }}>Expected answer:</span>
            {expectedAnswer}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button onClick={onCopy} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button onClick={onDelete} style={{ background: "none", border: "1px solid var(--danger)", backgroundColor: "rgba(245, 34, 61, 0.05)", borderRadius: "6px", padding: "6px", cursor: "pointer", color: "var(--danger)", display: "flex" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>
  );
};

export default QuizQuestionCard;
