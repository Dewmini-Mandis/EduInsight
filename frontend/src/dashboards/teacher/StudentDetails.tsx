import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/teacher.css";

type StudentProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  school_name?: string;
  student_profile?: {
    index_no: string;
    class_name: string;
    grade: string;
  };
};

const StudentDetails = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudentProfile> & { password?: string, index_no?: string, class_name?: string }>({});

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/accounts/users/${studentId}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error("Could not load student profile.");
        const data = await res.json() as StudentProfile;
        setProfile(data);
        setEditForm({
          ...data,
          index_no: data.student_profile?.index_no || "",
          class_name: data.student_profile?.class_name || ""
        });
      } catch (err: any) {
        setError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId]);

  const handleDelete = async () => {
    if (!profile) return;
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete student "${profile.full_name}" from the system? This will delete all their quiz attempts and performance records.`)) {
      return;
    }

    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${studentId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete student profile.");
      }

      alert("Student profile deleted successfully.");
      navigate("/teacher/students");
    } catch (err: any) {
      alert(err.message || "Could not delete student.");
    }
  };

  const handleSave = async () => {
    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${studentId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          index_no: editForm.index_no,
          class_name: editForm.class_name,
          ...(editForm.password ? { password: editForm.password } : {})
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(JSON.stringify(errData));
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setEditForm({
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        email: updatedProfile.email,
        index_no: updatedProfile.student_profile?.index_no || "",
        class_name: updatedProfile.student_profile?.class_name || ""
      });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || "Failed to update profile.");
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading student profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="teacher-card" style={{ padding: "24px", color: "#ef4444" }}>
        <h3>Error Loading Profile</h3>
        <p>{error || "Student not found."}</p>
        <Link to="/teacher/students" className="teacher-btn-secondary" style={{ display: "inline-block", marginTop: "12px", textDecoration: "none" }}>Back to List</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <div className="teacher-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <span className="teacher-badge success" style={{ marginBottom: "8px" }}>STUDENT</span>
            <h2 className="teacher-card-title" style={{ fontSize: "22px" }}>{profile.full_name || `${profile.first_name} ${profile.last_name}`}</h2>
            <span style={{ fontSize: "13px", color: "#64748b" }}>Username: <strong>{profile.username}</strong></span>
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            {isEditing ? (
              <>
                <button className="teacher-btn-secondary" onClick={() => { setIsEditing(false); setEditForm({
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  email: profile.email,
                  index_no: profile.student_profile?.index_no || "",
                  class_name: profile.student_profile?.class_name || ""
                }); }}>Cancel</button>
                <button className="teacher-btn-primary" onClick={handleSave}>Save Changes</button>
              </>
            ) : (
              <>
                <button className="teacher-btn-secondary" onClick={() => setIsEditing(true)}>Edit Details</button>
                <button className="teacher-btn-primary" onClick={() => navigate(`/teacher/students/${studentId}/progress`)}>View Progress</button>
              </>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--teacher-border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {isEditing ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>First Name</span>
                <input type="text" value={editForm.first_name || ""} onChange={e => setEditForm({...editForm, first_name: e.target.value})} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Last Name</span>
                <input type="text" value={editForm.last_name || ""} onChange={e => setEditForm({...editForm, last_name: e.target.value})} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Email Address</span>
                <input type="email" value={editForm.email || ""} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Index Number</span>
                <input type="text" value={editForm.index_no || ""} onChange={e => setEditForm({...editForm, index_no: e.target.value})} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Classroom Assignment</span>
                {teacherClassrooms.length > 0 ? (
                  <select 
                    value={editForm.class_name || ""} 
                    onChange={e => setEditForm({...editForm, class_name: e.target.value})} 
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif', backgroundColor: "var(--surface)" }}
                  >
                    <option value="">Select a classroom...</option>
                    {teacherClassrooms.map((cls: string) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={editForm.class_name || ""} onChange={e => setEditForm({...editForm, class_name: e.target.value})} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} placeholder="Enter class name (or configure in Profile)" />
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>New Password (Optional)</span>
                <div style={{ position: "relative" }}>
                  <input type="text" value={editForm.password || ""} onChange={e => setEditForm({...editForm, password: e.target.value})} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: '"Inter", sans-serif' }} placeholder="Leave blank to keep current password" />
                  <button type="button" onClick={() => setEditForm({...editForm, password: Math.random().toString(36).slice(-8)})} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--blue-600)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                    Generate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Email Address:</span>
                <span style={{ fontWeight: 600 }}>{profile.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Index Number:</span>
                <span style={{ fontWeight: 600 }}>{profile.student_profile?.index_no || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Classroom Assignment:</span>
                <span style={{ fontWeight: 600 }}>{profile.student_profile?.class_name || "N/A"}</span>
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div style={{ borderTop: "1px solid var(--teacher-border)", marginTop: "24px", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="teacher-btn-secondary"
              style={{ color: "#ef4444", borderColor: "#fca5a5" }}
              onClick={handleDelete}
            >
              Delete Student Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetails;
