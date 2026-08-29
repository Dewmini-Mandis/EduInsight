import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

const NoteViewer = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const res = await fetch(`/api/quizzes/materials/${materialId}/`, {
          headers: { Authorization: `Token ${getToken()}` }
        });
        if (res.ok) {
          setMaterial(await res.json());
        } else {
          setError("Failed to fetch note material.");
        }
      } catch (e) {
        setError("Error loading note material.");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [materialId]);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Note...</div>;
  if (error || !material) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>;

  const pdfAttachments = material.attachments?.filter((a: any) => a.attachment_type === "PDF") || [];
  const imageAttachments = material.attachments?.filter((a: any) => a.attachment_type === "IMAGE") || [];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", fontFamily: '"Inter", sans-serif' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "16px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}>
        &larr; Back
      </button>

      <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "28px", color: "#0f172a", marginTop: 0, marginBottom: "8px" }}>{material.title}</h1>
        <p style={{ color: "#64748b", marginBottom: "32px", fontSize: "14px" }}>
          Published on {new Date(material.created_at).toLocaleDateString()}
        </p>

        <div style={{ whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.7, fontSize: "16px" }}>
          {material.content}
        </div>

        {imageAttachments.length > 0 && (
          <div style={{ marginTop: "40px" }}>
            <h3 style={{ color: "#1e293b", marginBottom: "16px" }}>Images</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {imageAttachments.map((img: any) => (
                <a href={img.file} target="_blank" rel="noreferrer" key={img.id}>
                  <img src={img.file} alt="Note attachment" style={{ width: "100%", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {pdfAttachments.length > 0 && (
          <div style={{ marginTop: "40px" }}>
            <h3 style={{ color: "#1e293b", marginBottom: "16px" }}>Attached Documents</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pdfAttachments.map((pdf: any) => (
                <a 
                  key={pdf.id}
                  href={pdf.file} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", textDecoration: "none", color: "#334155" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <span style={{ fontWeight: "500" }}>{pdf.file.split("/").pop()}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteViewer;
