import React from "react";
import { Check, X } from "lucide-react";
import "../../styles/student.css";

interface QuizReviewSectionProps {
  questions: any[];
  answers: any[];
}

const QuizReviewSection: React.FC<QuizReviewSectionProps> = ({ questions, answers }) => {
  if (!questions || questions.length === 0) {
    return (
      <div className="student-card" style={{ textAlign: "center", padding: "32px", color: "#5D78A3" }}>
        No detailed question review data available.
      </div>
    );
  }

  return (
    <div className="student-card" style={{ marginTop: "24px" }}>
      <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#0B1F3A", marginBottom: "20px" }}>
        Detailed Answer Review
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {questions.map((q: any, idx: number) => {
          const userAns = answers?.find((a: any) => a.question === q.id);
          const isCorrect = userAns ? userAns.is_correct : false;

          return (
            <div key={q.id || idx} className="student-quiz-question-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontWeight: "700", fontSize: "13px", color: "#126BFF" }}>
                  Question #{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background: isCorrect ? "#E9FBF4" : "#FEF2F2",
                    color: isCorrect ? "#16B978" : "#FF4054",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isCorrect ? <Check size={14} /> : <X size={14} />}
                  {isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>

              <div style={{ fontSize: "16px", fontWeight: "600", color: "#0B1F3A", marginBottom: "14px" }}>
                {q.question_text}
              </div>

              {q.question_type === "MCQ" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {q.answers?.map((ans: any, aIdx: number) => {
                    const optionLetter = String.fromCharCode(65 + aIdx);
                    const isUserSelected = userAns?.selected_answer === ans.id;
                    const isCorrectAnswer = ans.is_correct;

                    let bg = "#FFFFFF";
                    let borderColor = "#DCE6F3";
                    let textColor = "#0B1F3A";

                    if (isCorrectAnswer) {
                      bg = "#E9FBF4";
                      borderColor = "#16B978";
                      textColor = "#16B978";
                    } else if (isUserSelected && !isCorrectAnswer) {
                      bg = "#FEF2F2";
                      borderColor = "#FF4054";
                      textColor = "#FF4054";
                    }

                    return (
                      <div
                        key={ans.id || aIdx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          border: `1px solid ${borderColor}`,
                          borderRadius: "10px",
                          background: bg,
                        }}
                      >
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "6px",
                            background: isCorrectAnswer ? "#16B978" : isUserSelected ? "#FF4054" : "#EAF3FF",
                            color: isCorrectAnswer || isUserSelected ? "#FFFFFF" : "#126BFF",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {optionLetter}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: isCorrectAnswer ? "600" : "400", color: textColor, flex: 1 }}>
                          {ans.answer_text}
                        </span>
                        {isCorrectAnswer && (
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#16B978" }}>
                            Correct Option
                          </span>
                        )}
                        {isUserSelected && !isCorrectAnswer && (
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#FF4054" }}>
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#0B1F3A" }}>
                  <div>
                    <span style={{ color: "#5D78A3" }}>Your Answer: </span>
                    <strong>{userAns?.typed_answer || "(None)"}</strong>
                  </div>
                  {!isCorrect && q.correct_value && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ color: "#5D78A3" }}>Correct Answer: </span>
                      <strong style={{ color: "#16B978" }}>{q.correct_value}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizReviewSection;
