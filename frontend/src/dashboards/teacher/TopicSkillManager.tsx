import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

import LessonTopicHeader from "./topics/LessonTopicHeader";
import TopicCard from "./topics/TopicCard";

type Topic = {
  id: number;
  name: string;
  lesson: number;
};

type Skill = {
  id: number;
  name: string;
  topic: number;
  lesson: number;
};

const TopicSkillManager = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Topic creation state
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [initialSkillName, setInitialSkillName] = useState("");
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  // Skill creation state
  const [addingSkillToTopic, setAddingSkillToTopic] = useState<number | null>(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const fetchData = async () => {
    const token = getToken();
    try {
      const [lessonRes, topicsRes, skillsRes] = await Promise.all([
        fetch(`/api/quizzes/lessons/${lessonId}/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/topics/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`/api/quizzes/skills/?lesson=${lessonId}`, { headers: { Authorization: `Token ${token}` } })
      ]);

      if (lessonRes.ok && topicsRes.ok && skillsRes.ok) {
        setLesson(await lessonRes.json());
        setTopics(await topicsRes.json());
        setSkills(await skillsRes.json());
      }
    } catch (err) {
      console.error("Failed to load topic and skill data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !initialSkillName.trim()) return;
    
    setTopicSubmitting(true);
    const token = getToken();
    
    try {
      // 1. Create Topic
      const topicRes = await fetch("/api/quizzes/topics/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ name: newTopicName, lesson: lessonId })
      });
      
      if (!topicRes.ok) throw new Error("Failed to create topic");
      const createdTopic = await topicRes.json();

      // 2. Create Initial Skill
      const skillRes = await fetch("/api/quizzes/skills/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ name: initialSkillName, topic: createdTopic.id, lesson: lessonId })
      });

      if (!skillRes.ok) throw new Error("Failed to create initial skill");

      setIsAddingTopic(false);
      setNewTopicName("");
      setInitialSkillName("");
      fetchData();
    } catch (err) {
      alert("Error saving topic. Please try again.");
      console.error(err);
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId: number) => {
    if (!window.confirm("Delete this topic? This will also delete all associated skills.")) return;
    
    const token = getToken();
    try {
      const res = await fetch(`/api/quizzes/topics/${topicId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete topic.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = async (e: React.FormEvent, topicId: number) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setSkillSubmitting(true);
    const token = getToken();

    try {
      const res = await fetch("/api/quizzes/skills/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ name: newSkillName, topic: topicId, lesson: lessonId })
      });

      if (res.ok) {
        setAddingSkillToTopic(null);
        setNewSkillName("");
        fetchData();
      } else {
        alert("Failed to add skill.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSkillSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skillId: number, topicId: number) => {
    // Enforce rule: A topic cannot exist without a skill
    const topicSkills = skills.filter(s => s.topic === topicId);
    if (topicSkills.length <= 1) {
      alert("A topic must have at least one skill. You cannot delete the last skill. Delete the topic entirely if it is no longer needed.");
      return;
    }

    if (!window.confirm("Delete this skill?")) return;
    
    const token = getToken();
    try {
      const res = await fetch(`/api/quizzes/skills/${skillId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete skill.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3" }}>Loading topics and skills...</div>;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column" }}>
      
      <LessonTopicHeader 
        lessonTitle={lesson?.title} 
        onAddTopic={() => setIsAddingTopic(true)} 
      />

      {isAddingTopic && (
        <div style={{ 
          backgroundColor: "#FFFFFF", 
          padding: "24px", 
          borderRadius: "16px", 
          border: "1px solid #E4ECF6",
          boxShadow: "0 6px 20px rgba(18, 63, 110, 0.05)",
          marginBottom: "24px"
        }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#0B1F3A" }}>Add New Topic</h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#5D78A3" }}>A topic must be associated with at least one skill. Please provide an initial skill name.</p>
          <form onSubmit={handleAddTopic} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#3D5E8A" }}>Topic Name</label>
              <input 
                type="text" 
                style={{ 
                  height: "44px", padding: "0 14px", border: "1px solid #DCE6F3", borderRadius: "9px", fontSize: "14px", outline: "none"
                }}
                placeholder="e.g., Adding Fractions" 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value)} 
                required 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#3D5E8A" }}>First Skill Name</label>
              <input 
                type="text" 
                style={{ 
                  height: "44px", padding: "0 14px", border: "1px solid #DCE6F3", borderRadius: "9px", fontSize: "14px", outline: "none"
                }}
                placeholder="e.g., Basic Addition with Common Denominators" 
                value={initialSkillName} 
                onChange={e => setInitialSkillName(e.target.value)} 
                required 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button 
                type="button" 
                onClick={() => { setIsAddingTopic(false); setNewTopicName(""); setInitialSkillName(""); }} 
                disabled={topicSubmitting}
                style={{ 
                  height: "42px", padding: "0 20px", backgroundColor: "#F6F9FD", border: "1px solid #DCE6F3", borderRadius: "9px", color: "#3D5E8A", fontSize: "14px", fontWeight: "600", cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={topicSubmitting}
                style={{ 
                  height: "42px", padding: "0 20px", background: "linear-gradient(135deg, #126BFF 0%, #169BFF 100%)", border: "none", borderRadius: "9px", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 5px 14px rgba(18, 107, 255, 0.20)", opacity: topicSubmitting ? 0.7 : 1
                }}
              >
                {topicSubmitting ? "Saving..." : "Save Topic & Skill"}
              </button>
            </div>
          </form>
        </div>
      )}

      {topics.length === 0 && !isAddingTopic ? (
        <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px dashed #DCE6F3" }}>
          <h3 style={{ color: "#0B1F3A", margin: "0 0 8px 0" }}>No topics found</h3>
          <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Create your first topic to start assigning skills.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {topics.map((topic, index) => {
            const topicSkills = skills.filter(s => s.topic === topic.id);
            return (
              <TopicCard 
                key={topic.id}
                topic={topic}
                index={index}
                skills={topicSkills}
                onDeleteTopic={handleDeleteTopic}
                onRemoveSkill={handleDeleteSkill}
                isAdding={addingSkillToTopic === topic.id}
                onStartAdding={() => {
                  setAddingSkillToTopic(topic.id);
                  setNewSkillName("");
                }}
                onCancelAdding={() => {
                  setAddingSkillToTopic(null);
                  setNewSkillName("");
                }}
                onSubmitSkill={handleAddSkill}
                newSkillName={newSkillName}
                setNewSkillName={setNewSkillName}
                skillSubmitting={skillSubmitting}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopicSkillManager;
