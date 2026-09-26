import React from "react";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { mockFeedbackData, FeedbackItem } from "../../data/mockFeedbackData";
import "../../styles/student.css";

interface QuickFeedbackProps {
  feedbackList?: FeedbackItem[];
}

const QuickFeedback: React.FC<QuickFeedbackProps> = ({ feedbackList = mockFeedbackData }) => {
  return (
    <div className="student-quick-feedback-card">
      <div className="student-quick-feedback-header">
        <h4 className="student-quick-feedback-title">Quick Feedback</h4>
        <span className="student-sample-feedback-tag">Sample feedback</span>
      </div>

      <div className="student-quick-feedback-list">
        {feedbackList.map((item) => (
          <div key={item.id} className="student-feedback-item">
            <div
              className={`student-feedback-icon-box ${
                item.type === "positive" ? "positive" : "suggestion"
              }`}
            >
              {item.type === "positive" ? (
                <CheckCircle2 size={16} color="#16B978" />
              ) : (
                <Lightbulb size={16} color="#6C4BFF" />
              )}
            </div>
            <span className="student-feedback-text">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickFeedback;
