import React from "react";
import { BookOpen } from "lucide-react";
import "../../styles/student.css";

const LearningPathHeader: React.FC = () => {
  return (
    <div className="student-header-card" style={{ marginBottom: "20px" }}>
      <div className="student-header-left">
        <div
          className="student-header-icon-box"
          style={{ backgroundColor: "#EAF3FF", color: "#126BFF", width: "56px", height: "56px" }}
        >
          <BookOpen size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="student-header-title" style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
            My Learning
          </h1>
          <p className="student-header-subtitle" style={{ fontSize: "15px", fontWeight: 500, marginTop: "4px" }}>
            Follow your structured curriculum, unlock quiz levels, and master academic terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LearningPathHeader;
