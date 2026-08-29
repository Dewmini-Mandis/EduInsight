import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

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

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading topics and skills...</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", color: "var(--navy-950)" }}>Manage Topics & Skills</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>Lesson: <strong>{lesson?.title}</strong></p>
        </div>
        <button onClick={() => navigate("/teacher/lessons")} className="teacher-btn-secondary">
          Back to Lessons
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button 
          onClick={() => setIsAddingTopic(true)} 
          className="teacher-btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add New Topic
        </button>
      </div>

      {isAddingTopic && (
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid var(--teacher-border)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--navy-950)" }}>Add New Topic</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--text-secondary)" }}>A topic must be associated with at least one skill. Please provide an initial skill name.</p>
          <form onSubmit={handleAddTopic} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="teacher-form-group" style={{ margin: 0 }}>
              <label className="teacher-form-label">Topic Name</label>
              <input 
                type="text" 
                className="teacher-form-input" 
                placeholder="e.g., Adding Fractions" 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value)} 
                required 
              />
            </div>
            <div className="teacher-form-group" style={{ margin: 0 }}>
              <label className="teacher-form-label">First Skill Name</label>
              <input 
                type="text" 
                className="teacher-form-input" 
                placeholder="e.g., Basic Addition with Common Denominators" 
                value={initialSkillName} 
                onChange={e => setInitialSkillName(e.target.value)} 
                required 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button 
                type="button" 
                onClick={() => { setIsAddingTopic(false); setNewTopicName(""); setInitialSkillName(""); }} 
                className="teacher-btn-secondary"
                disabled={topicSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="teacher-btn-primary"
                disabled={topicSubmitting}
              >
                {topicSubmitting ? "Saving..." : "Save Topic & Skill"}
              </button>
            </div>
          </form>
        </div>
      )}

      {topics.length === 0 && !isAddingTopic ? (
        <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <h3 style={{ color: "var(--navy-950)", marginBottom: "8px" }}>No topics found</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Create your first topic to start assigning skills.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {topics.map(topic => {
            const topicSkills = skills.filter(s => s.topic === topic.id);
            return (
              <div key={topic.id} style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid var(--teacher-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--navy-950)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--blue-600)" }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                    {topic.name}
                  </h3>
                  <button 
                    onClick={() => handleDeleteTopic(topic.id)} 
                    style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: "4px 8px", borderRadius: "4px" }}
                  >
                    Delete Topic
                  </button>
                </div>
                
                <div style={{ marginLeft: "26px", borderLeft: "2px solid #e2e8f0", paddingLeft: "16px" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Associated Skills</h4>
                  
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {topicSkills.map(skill => (
                      <li key={skill.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "14px", color: "var(--navy-950)", fontWeight: "500" }}>{skill.name}</span>
                        <button 
                          onClick={() => handleDeleteSkill(skill.id, topic.id)}
                          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                          title="Delete Skill"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {addingSkillToTopic === topic.id ? (
                    <form onSubmit={(e) => handleAddSkill(e, topic.id)} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                      <input 
                        type="text" 
                        className="teacher-form-input" 
                        style={{ padding: "8px 12px", fontSize: "13px", margin: 0, flex: 1 }}
                        placeholder="Enter new skill name" 
                        value={newSkillName} 
                        onChange={e => setNewSkillName(e.target.value)} 
                        autoFocus
                        required 
                      />
                      <button type="submit" disabled={skillSubmitting} className="teacher-btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Save</button>
                      <button type="button" disabled={skillSubmitting} onClick={() => { setAddingSkillToTopic(null); setNewSkillName(""); }} className="teacher-btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>Cancel</button>
                    </form>
                  ) : (
                    <button 
                      onClick={() => { setAddingSkillToTopic(topic.id); setNewSkillName(""); }}
                      style={{ marginTop: "12px", background: "none", border: "none", color: "var(--blue-600)", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "4px 0" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Skill
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopicSkillManager;
