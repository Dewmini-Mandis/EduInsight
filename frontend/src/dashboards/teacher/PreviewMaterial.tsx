import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

const PreviewMaterial = () => {
  const navigate = useNavigate();
  const { materialId } = useParams();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMaterial = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/materials/${materialId}/`, { headers: { Authorization: `Token ${token}` } });
        if (res.ok) {
          setMaterial(await res.json());
        } else {
          setError("Failed to fetch material");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading material");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [materialId]);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading material preview...</div>;
  if (error || !material) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error || "Material not found"}</div>;

  const renderContent = () => {
    if (material.material_type === "TEXT") {
      const pdfAttachments = material.attachments?.filter((a: any) => a.attachment_type === "PDF") || [];
      const imageAttachments = material.attachments?.filter((a: any) => a.attachment_type === "IMAGE") || [];

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6, fontSize: "15px" }}>
            {material.content || "No text content."}
          </div>

          {imageAttachments.length > 0 && (
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#1e293b" }}>Images</h3>
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
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#1e293b" }}>Documents</h3>
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
      );
    }
    
    if (material.material_type === "VIDEO") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: "800px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
             <video src={material.file} controls style={{ width: "100%", display: "block" }} />
          </div>
          <a href={material.file} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontWeight: "600", textDecoration: "none" }}>Open Video in New Tab</a>
        </div>
      );
    }

    return <div>Unknown material type</div>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          onClick={() => navigate("/teacher/materials")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#64748b", fontSize: "14px", fontWeight: "500", cursor: "pointer", padding: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Materials
        </button>

        <button 
          onClick={() => {
            if (material.material_type === "VIDEO") {
              navigate(`/teacher/materials/video/${materialId}/edit`);
            } else {
              navigate(`/teacher/materials/note/${materialId}/edit`);
            }
          }}
          style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #3b82f6", backgroundColor: "#fff", color: "#3b82f6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          Edit Material
        </button>
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #f0f0f0", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "24px" }}>{material.title}</h1>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
             <span style={{ backgroundColor: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontWeight: "600", color: "#475569" }}>{material.material_type}</span>
             <span>Uploaded on {new Date(material.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
           {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PreviewMaterial;
