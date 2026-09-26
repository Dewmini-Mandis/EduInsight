import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

import { FileText, Plus, UploadCloud, Search, X } from "lucide-react";
import MaterialRow from "./materials/MaterialRow";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
};

type MaterialItem = {
  id: number;
  title: string;
  material_type: "VIDEO" | "PDF" | "TEXT";
  lesson?: number;
  created_at: string;
};

const MaterialList = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverAddNote, setHoverAddNote] = useState(false);
  const [hoverUpload, setHoverUpload] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All Types");

  const [searchParams, setSearchParams] = useSearchParams();
  const quizParam = searchParams.get("quiz");

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const url = quizParam ? `/api/quizzes/materials/?quiz=${quizParam}` : "/api/quizzes/materials/";
      const res = await fetch(url, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : (data.results || []));
      } else {
        console.error("Failed to fetch materials");
      }
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quizParam]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/materials/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` }
        });
        if (res.ok) {
          fetchData();
        } else {
          alert("Failed to delete material.");
        }
      } catch (e) {
        alert("Error deleting material.");
      }
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "All Types" ? true : m.material_type === filterType.toUpperCase();
    return matchSearch && matchType;
  });

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3" }}>Loading materials...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "1240px", margin: "0 auto", padding: "24px 32px 100px 32px", gap: "24px" }}>
      
      {/* Inline Header matching LessonList / TopicSkillManager */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "20px" : "0"
      }}>
        {/* Left side */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#EAF3FF",
            color: "#126BFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#0B1F3A" }}>
                Materials
              </h2>
              {quizParam && (
                <span style={{ backgroundColor: "#FEF3C7", color: "#D97706", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  Quiz #{quizParam}
                  <button onClick={() => setSearchParams({})} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", display: "flex", padding: 0 }}>
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3" }}>
              {quizParam ? `Showing materials for Quiz #${quizParam}` : "Manage and assign learning materials."}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div style={{ 
          display: "flex", 
          gap: "12px",
          width: isMobile ? "100%" : "auto",
          flexDirection: isMobile ? "column" : "row"
        }}>
          <button 
            onClick={() => navigate("/teacher/materials/note/create")}
            onMouseEnter={() => setHoverAddNote(true)}
            onMouseLeave={() => setHoverAddNote(false)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px", 
              height: "42px",
              padding: "0 20px", 
              borderRadius: "9px", 
              border: `1px solid ${hoverAddNote ? "#C8D8EB" : "#DCE6F3"}`, 
              backgroundColor: hoverAddNote ? "#EEF4FB" : "#F6F9FD", 
              color: "#3D5E8A", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Note
          </button>

          <button 
            onClick={() => navigate("/teacher/materials/video/create")}
            onMouseEnter={() => setHoverUpload(true)}
            onMouseLeave={() => setHoverUpload(false)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "8px", 
              height: "42px",
              padding: "0 20px", 
              borderRadius: "9px", 
              border: "none", 
              background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", 
              color: "white", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)",
              transform: hoverUpload ? "translateY(-1px)" : "none",
              filter: hoverUpload ? "brightness(0.95)" : "none",
              transition: "all 150ms ease",
              width: isMobile ? "100%" : "auto"
            }}
          >
            <UploadCloud size={16} strokeWidth={2.5} />
            Upload Video
          </button>
        </div>
      </div>

      {/* Materials List Container */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
        padding: "18px"
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "16px",
          gap: isMobile ? "16px" : "0"
        }}>
          <div style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            color: "#3D5E8A",
            textTransform: "uppercase"
          }}>
            UPLOADED MATERIALS
          </div>

          <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto" }}>
            {/* Search Input */}
            <div style={{ position: "relative", width: isMobile ? "100%" : "300px" }}>
              <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#5D78A3", display: "flex" }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search materials..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 14px 0 42px",
                  borderRadius: "9px",
                  border: "1px solid #DCE6F3",
                  fontSize: "14px",
                  outline: "none",
                  color: "#0B1F3A",
                  transition: "all 0.2s"
                }}
                onFocus={(e:any) => {e.target.style.borderColor="#126BFF"; e.target.style.boxShadow="0 0 0 3px rgba(18,107,255,0.10)"}}
                onBlur={(e:any) => {e.target.style.borderColor="#DCE6F3"; e.target.style.boxShadow="none"}}
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                height: "42px",
                width: isMobile ? "100%" : "160px",
                padding: "0 14px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                fontSize: "14px",
                outline: "none",
                color: "#0B1F3A",
                backgroundColor: "#fff",
                transition: "all 0.2s",
                cursor: "pointer"
              }}
              onFocus={(e:any) => {e.target.style.borderColor="#126BFF"; e.target.style.boxShadow="0 0 0 3px rgba(18,107,255,0.10)"}}
              onBlur={(e:any) => {e.target.style.borderColor="#DCE6F3"; e.target.style.boxShadow="none"}}
            >
              <option value="All Types">All Types</option>
              <option value="Text">Text</option>
              <option value="Video">Video</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredMaterials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#5D78A3" }}>
              No materials found.
            </div>
          ) : (
            filteredMaterials.map((material) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  onPreview={() => navigate(`/teacher/materials/${material.id}/preview`)}
                  onEdit={() => {
                    if (material.material_type === "VIDEO") {
                      navigate(`/teacher/materials/video/${material.id}/edit`);
                    } else {
                      navigate(`/teacher/materials/note/${material.id}/edit`);
                    }
                  }}
                  onDelete={() => handleDelete(material.id)}
                />
              ))
            )}
        </div>
      </div>
    </div>
  );
};

export default MaterialList;
