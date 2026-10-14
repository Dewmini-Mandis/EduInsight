import React, { useState, useEffect } from "react";
import { FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import SkillList from "./SkillList";

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

interface TopicCardProps {
  topic: any;
  index: number;
  skills: any[];
  onDeleteTopic: (id: number) => void;
  onRemoveSkill: (skillId: number, topicId: number) => void;
  isAdding: boolean;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onSubmitSkill: (e: React.FormEvent, topicId: number) => void;
  newSkillName: string;
  setNewSkillName: (val: string) => void;
  skillSubmitting: boolean;
  isReadOnly?: boolean;
}

const THEMES = [
  { bg: "#EAF3FF", text: "#126BFF" }, // Blue
  { bg: "#E9FBF4", text: "#16B978" }, // Green
  { bg: "#F3ECFF", text: "#7C3AED" }, // Purple
];

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  index,
  skills,
  onDeleteTopic,
  onRemoveSkill,
  isAdding,
  onStartAdding,
  onCancelAdding,
  onSubmitSkill,
  newSkillName,
  setNewSkillName,
  skillSubmitting,
  isReadOnly = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoverDelete, setHoverDelete] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const theme = THEMES[index % THEMES.length];

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      border: "1px solid #E4ECF6",
      borderRadius: "16px",
      boxShadow: "0 6px 20px rgba(18, 63, 110, 0.045)",
      padding: "18px 20px",
      marginBottom: "20px"
    }}>
      {/* Topic Header */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "16px" : "0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            backgroundColor: theme.bg,
            color: theme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <FileText size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0B1F3A" }}>
              {topic.name}
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "14px", color: "#5D78A3" }}>
              Associated skills help define what students will learn in this topic.
            </p>
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          width: isMobile ? "100%" : "auto", 
          justifyContent: isMobile ? "space-between" : "flex-end" 
        }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              color: "#5D78A3",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px"
            }}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {!isReadOnly && (
            <button
              onClick={() => onDeleteTopic(topic.id)}
              onMouseEnter={() => setHoverDelete(true)}
              onMouseLeave={() => setHoverDelete(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "38px",
                padding: "0 14px",
                borderRadius: "8px",
                backgroundColor: hoverDelete ? "#FFE7EA" : "#FFF1F3",
                border: "1px solid #FFC4CB",
                color: "#E9283A",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 150ms ease"
              }}
            >
              <Trash2 size={14} strokeWidth={2.5} />
              Delete Topic
            </button>
          )}
        </div>
      </div>

      {/* Expandable Skills Area */}
      <div style={{
        overflow: "hidden",
        transition: "max-height 200ms ease, opacity 200ms ease",
        maxHeight: isExpanded ? "2000px" : "0px",
        opacity: isExpanded ? 1 : 0
      }}>
        <SkillList 
          topicId={topic.id}
          skills={skills}
          onRemoveSkill={onRemoveSkill}
          isAdding={isAdding}
          onStartAdding={onStartAdding}
          onCancelAdding={onCancelAdding}
          onSubmitSkill={onSubmitSkill}
          newSkillName={newSkillName}
          setNewSkillName={setNewSkillName}
          skillSubmitting={skillSubmitting}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
};

export default TopicCard;
