import React, { useState, useEffect } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";

interface Term {
  id: number;
  name: string;
  is_active: boolean;
  order: number;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  term: number;
  is_active: boolean;
}

const ManageCurriculum = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeTermId, setActiveTermId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", is_active: true });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [termRes, lessonRes] = await Promise.all([
        fetch("/api/quizzes/terms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/quizzes/lessons/", { headers: { Authorization: `Token ${token}` } })
      ]);
      if (termRes.ok && lessonRes.ok) {
        setTerms(await termRes.json());
        setLessons(await lessonRes.json());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleOpenCreateLesson = (termId: number) => {
    setActiveTermId(termId);
    setModalMode("create");
    setFormData({ title: "", description: "", is_active: true });
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setActiveTermId(lesson.term);
    setModalMode("edit");
    setFormData({ title: lesson.title, description: lesson.description, is_active: lesson.is_active });
    setShowLessonModal(true);
  };

  const handleOpenDeleteLesson = (lesson: Lesson) => {
    setDeleteTarget(lesson);
    setShowDeleteModal(true);
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !activeTermId) return;

    setActionLoading(true);
    const url = modalMode === "create" ? `/api/quizzes/lessons/` : `/api/quizzes/lessons/${selectedLesson?.id}/`;
    const method = modalMode === "create" ? "POST" : "PUT";
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          term: activeTermId,
          is_active: formData.is_active
        })
      });

      if (res.ok) {
        setShowLessonModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    const token = getToken();
    if (!token || !deleteTarget) return;

    try {
      const res = await fetch(`/api/quizzes/lessons/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (res.ok) {
        setShowDeleteModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const lessonColumns = (termId: number): Column<Lesson>[] => [
    { key: "title", header: "Lesson Title", width: "30%", render: (item) => <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.title}</div> },
    { key: "description", header: "Description", width: "45%", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.description || "No description"}</span> },
    { key: "status", header: "Status", width: "15%", render: (item) => (
        <span style={{ padding: "4px 8px", backgroundColor: item.is_active ? "var(--success-light, #d1fae5)" : "var(--danger-light, #fee2e2)", color: item.is_active ? "var(--success-dark, #065f46)" : "var(--danger-dark, #991b1b)", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
          {item.is_active ? "Active" : "Inactive"}
        </span>
      ) 
    },
    { key: "actions", header: "Actions", width: "10%", render: (item) => (
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={() => handleOpenEditLesson(item)} style={{ background: "none", border: "none", color: "var(--blue-600)", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}>Edit</button>
        <button onClick={() => handleOpenDeleteLesson(item)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}>Delete</button>
      </div>
    )}
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0" }}>Curriculum Management</h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>Configure Academic Terms and Lessons here.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
      ) : (
        terms.map(term => (
          <ChartCard 
            key={term.id} 
            title={term.name} 
            headerAction={
              <button onClick={() => handleOpenCreateLesson(term.id)} style={{ padding: "8px 16px", backgroundColor: "var(--blue-600)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                Add Lesson
              </button>
            }
          >
            <div style={{ margin: "0 -20px" }}>
              {lessons.filter(l => l.term === term.id).length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No lessons found for {term.name}. Click "Add Lesson" to create one.
                </div>
              ) : (
                <DataTable 
                  columns={lessonColumns(term.id)} 
                  data={lessons.filter(l => l.term === term.id)} 
                  keyExtractor={(l) => l.id} 
                />
              )}
            </div>
          </ChartCard>
        ))
      )}

      {showLessonModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{modalMode === "create" ? "Create Lesson" : "Edit Lesson"}</h3>
            <form onSubmit={handleSubmitLesson} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Lesson Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none", minHeight: "80px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                <label htmlFor="is_active" style={{ fontSize: "14px", fontWeight: "500" }}>Active</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowLessonModal(false)} disabled={actionLoading} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.5 : 1 }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: "10px 16px", backgroundColor: "var(--blue-600)", color: "white", border: "none", borderRadius: "8px", cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}>
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete Lesson</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDeleteLesson} style={{ padding: "10px 16px", backgroundColor: "var(--danger)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCurriculum;
