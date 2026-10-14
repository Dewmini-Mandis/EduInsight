import React, { useState } from "react";
import LearningPathHeader from "../../components/student/LearningPathHeader";
import TermSelectorCard from "../../components/student/TermSelectorCard";
import LearningFeatureCard from "../../components/student/LearningFeatureCard";
import "../../styles/student.css";

const LearningPathPage: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");

  return (
    <div className="student-page-full-height">
      <LearningPathHeader />
      <TermSelectorCard selectedTerm={selectedTerm} onSelectTerm={setSelectedTerm} />
      <LearningFeatureCard />
    </div>
  );
};

export default LearningPathPage;
