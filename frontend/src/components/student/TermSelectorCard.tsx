import React from "react";
import { Calendar, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/student.css";

interface TermOption {
  title: string;
  subtitle: string;
}

interface TermSelectorCardProps {
  selectedTerm: string;
  onSelectTerm: (termTitle: string) => void;
}

const termsList: TermOption[] = [
  { title: "Term 1", subtitle: "Start Learning" },
  { title: "Term 2", subtitle: "Continue Your Journey" },
  { title: "Term 3", subtitle: "Advanced Learning" },
];

const TermSelectorCard: React.FC<TermSelectorCardProps> = ({ selectedTerm, onSelectTerm }) => {
  const navigate = useNavigate();

  const handleCardClick = (termTitle: string) => {
    onSelectTerm(termTitle);
    navigate(`/student/learning-path/term/${encodeURIComponent(termTitle)}/lessons`);
  };

  return (
    <div className="student-card student-term-card-container" style={{ padding: "24px 28px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            backgroundColor: "#EAF3FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#126BFF",
          }}
        >
          <Calendar size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Select an Academic Term
          </h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: "2px 0 0", fontWeight: 400 }}>
            Choose a term to explore lessons and continue your learning journey.
          </p>
        </div>
      </div>

      <div className="student-term-grid" style={{ gap: "16px", marginTop: "12px" }}>
        {termsList.map((term) => {
          const isSelected = selectedTerm === term.title;
          return (
            <div
              key={term.title}
              className={`student-term-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleCardClick(term.title)}
              style={{
                minHeight: "120px",
                padding: "16px 18px",
                borderRadius: "14px",
              }}
            >
              {isSelected && (
                <div className="student-term-check-icon" style={{ width: "20px", height: "20px", top: "10px", right: "10px" }}>
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
              <div
                className="student-term-icon"
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  marginBottom: "8px",
                }}
              >
                <Calendar size={20} />
              </div>
              <div className="student-term-title" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "2px" }}>
                {term.title}
              </div>
              <div className="student-term-subtitle" style={{ fontSize: "14px", color: "#5D78A3" }}>
                {term.subtitle}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TermSelectorCard;
