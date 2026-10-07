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
    <div className="student-card student-term-card-container" style={{ padding: "28px 32px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            backgroundColor: "#EAF3FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#126BFF",
          }}
        >
          <Calendar size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0B1F3A", margin: 0 }}>
            Select an Academic Term
          </h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: "3px 0 0", fontWeight: 400 }}>
            Choose a term to explore lessons and continue your learning journey.
          </p>
        </div>
      </div>

      <div className="student-term-grid">
        {termsList.map((term) => {
          const isSelected = selectedTerm === term.title;
          return (
            <div
              key={term.title}
              className={`student-term-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleCardClick(term.title)}
            >
              {isSelected && (
                <div className="student-term-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
              )}
              <div className="student-term-icon">
                <Calendar size={22} />
              </div>
              <div className="student-term-title">
                {term.title}
              </div>
              <div className="student-term-subtitle">
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
