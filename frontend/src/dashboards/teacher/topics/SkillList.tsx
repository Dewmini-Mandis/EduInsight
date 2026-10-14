import React, { useState, useEffect } from "react";
import SkillRow from "./SkillRow";
import AddSkillButton from "./AddSkillButton";

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

interface SkillListProps {
  topicId: number;
  skills: any[];
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

const SkillList: React.FC<SkillListProps> = ({
  topicId,
  skills,
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div style={{
      marginTop: "14px",
      marginLeft: isMobile ? "0" : "64px",
      backgroundColor: "#F7FAFE",
      borderRadius: "12px",
      padding: "14px 16px"
    }}>
      <div style={{
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.5px",
        color: "#3D5E8A",
        marginBottom: "12px"
      }}>
        ASSOCIATED SKILLS
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {skills.map((skill) => (
          <SkillRow 
            key={skill.id} 
            skill={skill} 
            onRemove={(skillId) => onRemoveSkill(skillId, topicId)} 
            isReadOnly={isReadOnly}
          />
        ))}

        {!isReadOnly && (
          <AddSkillButton
            isAdding={isAdding}
            onStartAdding={onStartAdding}
            onCancel={onCancelAdding}
            onSubmit={(e) => onSubmitSkill(e, topicId)}
            newSkillName={newSkillName}
            setNewSkillName={setNewSkillName}
            isSubmitting={skillSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default SkillList;
