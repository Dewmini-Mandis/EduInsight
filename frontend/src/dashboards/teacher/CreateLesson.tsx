import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import "../../styles/teacher.css";

const CreateLesson = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState("1st Term");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    const token = getToken();

    const payload = {
      title,
      description,
      term
    };

    try {
      const res = await fetch("/api/quizzes/lessons/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Unable to save lesson.");
      }

      alert("Lesson topic created successfully.");
      navigate("/teacher/lessons");
    } catch (err: any) {
      setError(err.message || "Failed to create lesson.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="teacher-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2 className="teacher-card-title" style={{ fontSize: "20px", marginBottom: "24px" }}>Add Syllabus Lesson</h2>
      
      {error && <div className="teacher-badge danger" style={{ width: "100%", padding: "12px", marginBottom: "20px" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="teacher-form-group">
          <label className="teacher-form-label">Lesson Title</label>
          <input
            type="text"
            className="teacher-form-input"
            placeholder="e.g., Intro to Fluid Mechanics"
            value={title}
            onChange={(e) => { setError(""); setTitle(e.target.value); }}
            required
          />
        </div>

        <div className="teacher-form-group">
          <label className="teacher-form-label">Academic Term</label>
          <select
            className="teacher-dropdown-filter"
            style={{ width: "100%" }}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          >
            <option value="1st Term">1st Term</option>
            <option value="2nd Term">2nd Term</option>
            <option value="3rd Term">3rd Term</option>
          </select>
        </div>

        <div className="teacher-form-group">
          <label className="teacher-form-label">Topic Description</label>
          <textarea
            className="teacher-form-input"
            style={{ minHeight: "120px", fontFamily: "inherit" }}
            placeholder="Provide detail on concepts covered under this syllabus topic..."
            value={description}
            onChange={(e) => { setError(""); setDescription(e.target.value); }}
            required
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px" }}>
          <button
            type="button"
            className="teacher-btn-secondary"
            onClick={() => navigate("/teacher/lessons")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="teacher-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Topic"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLesson;
