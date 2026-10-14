import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { ArrowLeft, Edit3, FileText, Calendar, Paperclip, Download, ExternalLink, Play, HelpCircle } from "lucide-react";

const PreviewMaterial = () => {
  const navigate = useNavigate();
  const { materialId } = useParams();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = getUser();
  const isTeacher = currentUser?.role === "TEACHER";

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

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3" }}>Loading material preview...</div>;
  if (error || !material) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054" }}>{error || "Material not found"}</div>;

  const handleEdit = () => {
    if (material.material_type === "VIDEO") {
      navigate(`/teacher/materials/video/${materialId}/edit`);
    } else {
      navigate(`/teacher/materials/note/${materialId}/edit`);
    }
  };

  const sectionOrder: string[] = material.section_order && material.section_order.length > 0
    ? material.section_order
    : ["NOTE", "ATTACHMENTS", "VIDEO"];

  const pdfAttachments = material.attachments?.filter((a: any) => a.attachment_type === "PDF") || [];
  const imageAttachments = material.attachments?.filter((a: any) => a.attachment_type === "IMAGE") || [];
  const totalFiles = pdfAttachments.length + imageAttachments.length;

  const renderNoteSection = () => {
    if (!material.content) return null;
    return (
      <div key="NOTE" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <FileText size={20} color="#0B1F3A" />
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>Note Content</h2>
        </div>
        <div style={{ backgroundColor: "#F8FBFF", border: "1px solid #DCE6F3", borderRadius: "10px", padding: "20px", minHeight: "90px", fontSize: "14px", lineHeight: 1.6, color: "#0B1F3A" }}>
          <div dangerouslySetInnerHTML={{ __html: material.content }} />
        </div>
      </div>
    );
  };

  const renderAttachmentsSection = () => {
    if (totalFiles === 0) return null;
    return (
      <div key="ATTACHMENTS" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Paperclip size={20} color="#0B1F3A" />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>Documents & Attachments</h2>
          </div>
          <span style={{ fontSize: "13px", color: "#5D78A3" }}>{totalFiles} file{totalFiles !== 1 ? 's' : ''} attached</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pdfAttachments.map((pdf: any) => (
            <div key={pdf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FBFF", border: "1px solid #DCE6F3", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: "#FF4054", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "15px", fontWeight: "600", color: "#0B1F3A" }}>{pdf.file.split("/").pop()}</span>
                  <span style={{ fontSize: "13px", color: "#5D78A3" }}>PDF Document</span>
                </div>
              </div>
              <a href={pdf.file} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none", height: "40px", padding: "0 16px", borderRadius: "8px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#126BFF", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e:any) => e.currentTarget.style.backgroundColor="#F6F9FD"} onMouseLeave={(e:any) => e.currentTarget.style.backgroundColor="#FFFFFF"}>
                <Download size={16} /> Download
              </a>
            </div>
          ))}
          {imageAttachments.map((img: any) => (
            <div key={img.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FBFF", border: "1px solid #DCE6F3", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: "#169BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "15px", fontWeight: "600", color: "#0B1F3A" }}>{img.file.split("/").pop()}</span>
                  <span style={{ fontSize: "13px", color: "#5D78A3" }}>Image File</span>
                </div>
              </div>
              <a href={img.file} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none", height: "40px", padding: "0 16px", borderRadius: "8px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#126BFF", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }} onMouseEnter={(e:any) => e.currentTarget.style.backgroundColor="#F6F9FD"} onMouseLeave={(e:any) => e.currentTarget.style.backgroundColor="#FFFFFF"}>
                <ExternalLink size={16} /> View Image
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVideoSection = () => {
    if (!material.file) return null;
    return (
      <div key="VIDEO" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Play size={20} color="#0B1F3A" />
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>Video Material</h2>
        </div>
        <div style={{ width: "100%", aspectRatio: "16 / 9", maxHeight: "520px", backgroundColor: "#111111", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
          <video src={material.file} controls style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <a href={material.file} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#126BFF", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
            <ExternalLink size={16} /> Open Video in New Tab
          </a>
        </div>
      </div>
    );
  };

  const renderSection = (type: string) => {
    if (type === "NOTE") return renderNoteSection();
    if (type === "ATTACHMENTS") return renderAttachmentsSection();
    if (type === "VIDEO") return renderVideoSection();
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "1240px", margin: "0 auto", padding: "24px 32px 100px 32px", gap: "24px", fontFamily: '"Inter", sans-serif' }}>
      
      {/* Top Action Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#4F6D96", fontSize: "14px", fontWeight: "600", cursor: "pointer", padding: "8px 0", transition: "color 0.2s" }}
          onMouseEnter={(e:any) => e.currentTarget.style.color="#0B1F3A"}
          onMouseLeave={(e:any) => e.currentTarget.style.color="#4F6D96"}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Back
        </button>

        {isTeacher && (
          <button 
            onClick={handleEdit}
            style={{ display: "flex", alignItems: "center", gap: "8px", height: "42px", padding: "0 18px", borderRadius: "99px", border: "1px solid #126BFF", backgroundColor: "#FFFFFF", color: "#126BFF", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e:any) => {e.currentTarget.style.backgroundColor="#EEF4FB"}}
            onMouseLeave={(e:any) => {e.currentTarget.style.backgroundColor="#FFFFFF"}}
          >
            <Edit3 size={16} strokeWidth={2.5} />
            Edit Material
          </button>
        )}
      </div>

      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", padding: "24px", boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)" }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "12px", backgroundColor: material.material_type === "VIDEO" ? "#F1EDFF" : "#EAF3FF", color: material.material_type === "VIDEO" ? "#6C4BFF" : "#126BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {material.material_type === "VIDEO" ? <Play size={32} strokeWidth={2} /> : <FileText size={32} strokeWidth={2} />}
          </div>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700", color: "#0B1F3A", lineHeight: 1.2 }}>{material.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ backgroundColor: material.material_type === "VIDEO" ? "#F1EDFF" : "#EEF4FB", color: material.material_type === "VIDEO" ? "#6C4BFF" : "#3D5E8A", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>
                {material.material_type}
              </span>
              {material.quiz_title && (
                <span style={{ backgroundColor: "#FEF3C7", color: "#D97706", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                  <HelpCircle size={12} /> Quiz: {material.quiz_title}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#5D78A3", fontSize: "13px" }}>
                <Calendar size={14} />
                Uploaded on {new Date(material.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #E4ECF6", margin: "24px 0" }} />

        {/* Dynamic Section Ordering */}
        {sectionOrder.map((sectionType) => renderSection(sectionType))}

      </div>

    </div>
  );
};

export default PreviewMaterial;

