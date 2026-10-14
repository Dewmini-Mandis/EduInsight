import React from "react";
import { TrendingUp } from "lucide-react";
import "../../../styles/student.css";

interface ProgressHeaderProps {
  title: string;
  subtitle: string;
  rightAction?: React.ReactNode;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ title, subtitle, rightAction }) => {
  return (
    <div className="student-header-card">
      <div className="student-header-left">
        <div className="student-header-icon-box" style={{ background: "#F1EDFF" }}>
          <TrendingUp size={24} color="#6C4BFF" />
        </div>
        <div>
          <h1 className="student-header-title">{title}</h1>
          <p className="student-header-subtitle">{subtitle}</p>
        </div>
      </div>

      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};

export default ProgressHeader;
