import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

const InteractiveVideoPlayer = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{msg: string, isError: boolean} | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const res = await fetch(`/api/quizzes/materials/${materialId}/`, {
          headers: { Authorization: `Token ${getToken()}` }
        });
        if (res.ok) {
          setMaterial(await res.json());
        } else {
          setError("Failed to fetch material.");
        }
      } catch (e) {
        setError("Error loading material.");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [materialId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !material || !material.video_questions) return;
    
    const currentTime = videoRef.current.currentTime;
    
    // Check if we hit any question timestamp
    for (let q of material.video_questions) {
      if (!answeredQuestions.has(q.id) && Math.abs(currentTime - q.timestamp) < 0.5) {
        // Pause and show question
        videoRef.current.pause();
        setActiveQuestion(q);
        setSelectedOptionIdx(null);
        setFeedback(null);
        break;
      }
    }
  };

  const handleSeeked = () => {
    // If they seek past an unanswered question, we could force them back, 
    // but for now, we just let the timeupdate catch it if they land near it.
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIdx === null) return;
    
    const option = activeQuestion.options[selectedOptionIdx];
    if (option.is_correct) {
      setFeedback({ msg: "Correct!", isError: false });
      setTimeout(() => {
        setAnsweredQuestions(prev => new Set(prev).add(activeQuestion.id));
        setActiveQuestion(null);
        if (videoRef.current) videoRef.current.play();
      }, 1500);
    } else {
      setFeedback({ msg: "Incorrect. Try again.", isError: true });
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Interactive Video...</div>;
  if (error || !material) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px", fontFamily: '"Inter", sans-serif' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "16px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}>
        &larr; Back
      </button>

      <h1 style={{ fontSize: "24px", color: "#0f172a", marginBottom: "8px" }}>{material.title}</h1>
      <p style={{ color: "#64748b", marginBottom: "24px" }}>Interactive Video Lesson</p>

      <div style={{ position: "relative", width: "100%", backgroundColor: "#000", borderRadius: "12px", overflow: "hidden" }}>
        <video 
          ref={videoRef}
          src={material.file} 
          controls={!activeQuestion} 
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleSeeked}
          style={{ width: "100%", display: "block" }} 
        />

        {activeQuestion && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
          }}>
            <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "80%", maxWidth: "500px" }}>
              <h3 style={{ marginTop: 0, color: "#1e293b", fontSize: "18px" }}>Question Time!</h3>
              <p style={{ color: "#334155", fontSize: "16px", marginBottom: "24px" }}>{activeQuestion.question_text}</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {activeQuestion.options.map((opt: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedOptionIdx(idx)}
                    style={{
                      padding: "12px 16px", textAlign: "left", borderRadius: "8px",
                      border: selectedOptionIdx === idx ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                      backgroundColor: selectedOptionIdx === idx ? "#eff6ff" : "white",
                      cursor: "pointer", fontSize: "15px", color: "#1e293b"
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {feedback && (
                <div style={{ marginTop: "16px", padding: "12px", borderRadius: "6px", backgroundColor: feedback.isError ? "#fee2e2" : "#d1fae5", color: feedback.isError ? "#b91c1c" : "#047857", fontWeight: "600", textAlign: "center" }}>
                  {feedback.msg}
                </div>
              )}

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={handleSubmitAnswer}
                  disabled={selectedOptionIdx === null}
                  style={{ padding: "10px 24px", backgroundColor: "#3b82f6", color: "white", borderRadius: "8px", border: "none", fontWeight: "600", cursor: selectedOptionIdx === null ? "not-allowed" : "pointer", opacity: selectedOptionIdx === null ? 0.6 : 1 }}
                >
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveVideoPlayer;
