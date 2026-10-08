import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

interface InteractiveVideoPlayerProps {
  materialId?: string | number;
  materialData?: any;
  onCompleted?: () => void;
}

const InteractiveVideoPlayer: React.FC<InteractiveVideoPlayerProps> = ({
  materialId: propMaterialId,
  materialData,
  onCompleted,
}) => {
  const params = useParams();
  const materialId = propMaterialId || params.materialId;
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [material, setMaterial] = useState<any>(materialData || null);
  const [loading, setLoading] = useState(!materialData);
  const [error, setError] = useState("");

  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string, isError: boolean } | null>(null);

  useEffect(() => {
    if (materialData) {
      setMaterial(materialData);
      setLoading(false);
      return;
    }
    if (!materialId) return;

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
  }, [materialId, materialData]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !material || !material.video_questions) return;
    const currentTime = videoRef.current.currentTime;

    // Check for earliest unanswered checkpoint
    const unanswered = (material.video_questions as any[])
      .filter((q) => !answeredQuestions.has(q.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (unanswered.length > 0) {
      const earliestLocked = unanswered[0];
      // Lock seek if current time exceeds checkpoint
      if (currentTime > earliestLocked.timestamp + 0.5) {
        videoRef.current.currentTime = Math.max(0, earliestLocked.timestamp - 0.1);
        videoRef.current.pause();
        setActiveQuestion(earliestLocked);
        setSelectedOptionIdx(null);
        setFeedback(null);
        return;
      }
    }

    // Trigger checkpoint when playback reaches timestamp
    for (let q of material.video_questions) {
      if (!answeredQuestions.has(q.id) && Math.abs(currentTime - q.timestamp) < 0.5) {
        videoRef.current.pause();
        setActiveQuestion(q);
        setSelectedOptionIdx(null);
        setFeedback(null);
        break;
      }
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current || !material || !material.video_questions) return;
    const currentTime = videoRef.current.currentTime;
    const unanswered = (material.video_questions as any[])
      .filter((q) => !answeredQuestions.has(q.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (unanswered.length > 0 && currentTime > unanswered[0].timestamp) {
      videoRef.current.currentTime = Math.max(0, unanswered[0].timestamp - 0.1);
      videoRef.current.pause();
      setActiveQuestion(unanswered[0]);
      setSelectedOptionIdx(null);
      setFeedback(null);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIdx === null || !activeQuestion) return;

    const option = activeQuestion.options[selectedOptionIdx];
    if (option.is_correct) {
      setFeedback({ msg: "Correct!", isError: false });
      setTimeout(() => {
        setAnsweredQuestions((prev) => new Set(prev).add(activeQuestion.id));
        setActiveQuestion(null);
        setSelectedOptionIdx(null);
        setFeedback(null);
        if (videoRef.current) videoRef.current.play();
      }, 1000);
    } else {
      setFeedback({ msg: "Incorrect. Try again.", isError: true });
    }
  };

  const handleVideoEnded = () => {
    if (onCompleted) {
      onCompleted();
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Interactive Video...</div>;
  if (error || !material) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "16px", fontFamily: '"Inter", sans-serif' }}>
      {!materialData && (
        <button onClick={() => navigate(-1)} style={{ marginBottom: "16px", background: "none", border: "none", color: "#126BFF", cursor: "pointer", fontWeight: "600" }}>
          &larr; Back
        </button>
      )}

      <div style={{ position: "relative", width: "100%", backgroundColor: "#000", borderRadius: "12px", overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={material.file}
          controls={!activeQuestion}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeking}
          onEnded={handleVideoEnded}
          style={{ width: "100%", display: "block", maxHeight: "500px" }}
        />

        {activeQuestion && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
          }}>
            <div style={{ backgroundColor: "white", padding: "28px", borderRadius: "12px", width: "85%", maxWidth: "480px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, color: "#0B1F3A", fontSize: "17px", fontWeight: "700" }}>Checkpoint Question ({Math.floor(activeQuestion.timestamp)}s)</h3>
                <span style={{ fontSize: "12px", backgroundColor: "#EFF6FF", color: "#126BFF", padding: "2px 8px", borderRadius: "4px", fontWeight: "600" }}>{activeQuestion.question_type}</span>
              </div>
              <p style={{ color: "#334155", fontSize: "15px", marginBottom: "20px", fontWeight: "500" }}>{activeQuestion.question_text}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activeQuestion.options?.map((opt: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedOptionIdx(idx); setFeedback(null); }}
                    style={{
                      padding: "12px 16px", textAlign: "left", borderRadius: "8px",
                      border: selectedOptionIdx === idx ? "2px solid #126BFF" : "1px solid #DCE6F3",
                      backgroundColor: selectedOptionIdx === idx ? "#F0F6FF" : "white",
                      cursor: "pointer", fontSize: "14px", color: "#0B1F3A", fontWeight: selectedOptionIdx === idx ? "600" : "400",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {feedback && (
                <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "6px", backgroundColor: feedback.isError ? "#FFF1F3" : "#F0FDF4", color: feedback.isError ? "#FF4054" : "#16A34A", fontWeight: "600", fontSize: "14px", textAlign: "center", border: `1px solid ${feedback.isError ? "#FFC5CB" : "#BBF7D0"}` }}>
                  {feedback.msg}
                </div>
              )}

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOptionIdx === null}
                  style={{ padding: "10px 24px", backgroundColor: "#126BFF", color: "white", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "14px", cursor: selectedOptionIdx === null ? "not-allowed" : "pointer", opacity: selectedOptionIdx === null ? 0.6 : 1 }}
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

