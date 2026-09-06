import React, { useState, useEffect } from "react";
import { Eye, Edit3, Trash2, FileText, Play } from "lucide-react";

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

interface MaterialRowProps {
  material: any;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MaterialRow: React.FC<MaterialRowProps> = ({ material, onPreview, onEdit, onDelete }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [hoverPreview, setHoverPreview] = useState(false);
  const [hoverEdit, setHoverEdit] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);

  const getTypeColor = (type: string) => {
    switch(type) {
      case "VIDEO": return { bg: "#F1EDFF", text: "#6C4BFF", icon: Play };
      case "TEXT": return { bg: "#EEF4FB", text: "#3D5E8A", icon: FileText, boxBg: "#EAF3FF", boxIcon: "#126BFF" };
      case "PDF": return { bg: "#fee2e2", text: "#b91c1c", icon: FileText, boxBg: "#fee2e2", boxIcon: "#b91c1c" };
      default: return { bg: "#f1f5f9", text: "#475569", icon: FileText, boxBg: "#f1f5f9", boxIcon: "#475569" };
    }
  };
  const typeColors = getTypeColor(material.material_type);
  const IconCmp = typeColors.icon;

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #DCE6F3",
      borderRadius: "10px",
      minHeight: "82px",
      padding: "12px 16px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      marginBottom: "8px",
      gap: "12px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, overflow: "hidden" }}>
        
        {/* Large Icon Box */}
        <div style={{
          width: "52px",
          height: "52px",
          borderRadius: "10px",
          backgroundColor: material.material_type === "VIDEO" ? "#F1EDFF" : typeColors.boxBg || typeColors.bg,
          color: material.material_type === "VIDEO" ? "#6C4BFF" : typeColors.boxIcon || typeColors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
          <IconCmp size={24} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ 
            fontSize: "16px", 
            fontWeight: "700", 
            color: "#0B1F3A",
            lineHeight: "1.4"
          }}>
            {material.title}
          </span>
          <div style={{ 
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "6px"
          }}>
            <span style={{ 
              backgroundColor: typeColors.bg, 
              color: typeColors.text, 
              padding: "4px 8px", 
              borderRadius: "6px", 
              fontSize: "11px", 
              fontWeight: "700", 
              letterSpacing: "0.5px",
              textTransform: "uppercase" 
            }}>
              {material.material_type}
            </span>
            <span style={{ 
              fontSize: "13px", 
              color: "#5D78A3"
            }}>
              Uploaded on {new Date(material.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: "flex", 
        justifyContent: isMobile ? "flex-end" : "flex-end",
        width: isMobile ? "100%" : "auto",
        gap: "6px"
      }}>
        <button
          onClick={onPreview}
          onMouseEnter={() => setHoverPreview(true)}
          onMouseLeave={() => setHoverPreview(false)}
          style={{
            background: hoverPreview ? "#EAF3FF" : "#FFFFFF",
            border: "1px solid #DCE6F3",
            color: "#126BFF",
            cursor: "pointer",
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease"
          }}
          title="Preview Material"
        >
          <Eye size={18} strokeWidth={2} />
        </button>

        <button
          onClick={onEdit}
          onMouseEnter={() => setHoverEdit(true)}
          onMouseLeave={() => setHoverEdit(false)}
          style={{
            background: hoverEdit ? "#EAF3FF" : "#FFFFFF",
            border: "1px solid #DCE6F3",
            color: "#126BFF",
            cursor: "pointer",
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease"
          }}
          title="Edit Material"
        >
          <Edit3 size={18} strokeWidth={2} />
        </button>

        <button
          onClick={onDelete}
          onMouseEnter={() => setHoverDelete(true)}
          onMouseLeave={() => setHoverDelete(false)}
          style={{
            background: hoverDelete ? "#FFC5CB" : "#FFF1F3",
            border: "1px solid #FFC5CB",
            color: "#FF4054",
            cursor: "pointer",
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 150ms ease"
          }}
          title="Delete Material"
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default MaterialRow;
