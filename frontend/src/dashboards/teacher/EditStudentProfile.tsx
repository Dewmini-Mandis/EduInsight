import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { Edit3 } from "lucide-react";
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
    class_room?: { id: number; name: string };
  };
};

const EditStudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
        
        setEditForm({
          ...data,
          index_no: data.student_profile?.index_no || "",
          class_name: data.student_profile?.class_room?.name || data.student_profile?.class_name || ""
        });
      } catch (err: any) {
        setError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
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

      alert("Student profile updated successfully.");
      navigate(`/teacher/students/${studentId}`);
    } catch (err: any) {
      alert(err.message || "Failed to update profile.");
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>Loading student profile...</div>;
  if (error) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054", fontFamily: '"Inter", sans-serif' }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Breadcrumb */}
      <div style={{ fontSize: "14px", color: "#5D78A3", display: "flex", gap: "8px", alignItems: "center" }}>
        <Link to="/teacher/dashboard" style={{ color: "#5D78A3", textDecoration: "none" }}>Dashboard</Link>
        <span>&gt;</span>
        <Link to="/teacher/students" style={{ color: "#5D78A3", textDecoration: "none" }}>Students</Link>
        <span>&gt;</span>
        <span style={{ fontWeight: 600, color: "#0B1F3A" }}>Edit Student Profile</span>
      </div>

      {/* Header Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Edit3 size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Edit Student Profile</h1>
            <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0 }}>Update the student's information.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 24px 0" }}>Student Information</h2>
          
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Row 1 */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  First Name <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editForm.first_name || ""} 
                  onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                  style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  Last Name <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editForm.last_name || ""} 
                  onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                  style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  Email Address <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input 
                  type="email" 
                  required
                  value={editForm.email || ""} 
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  Index Number <span style={{ color: "#FF4054" }}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editForm.index_no || ""} 
                  onChange={e => setEditForm({...editForm, index_no: e.target.value})}
                  style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  Classroom Assignment <span style={{ color: "#FF4054" }}>*</span>
                </label>
                {teacherClassrooms.length > 0 ? (
                  <select 
                    required
                    value={editForm.class_name || ""} 
                    onChange={e => setEditForm({...editForm, class_name: e.target.value})} 
                    style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box", backgroundColor: "#FFFFFF", cursor: "pointer", appearance: "none", backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B1F3A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", backgroundSize: "10px auto" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">Select a classroom...</option>
                    {teacherClassrooms.map((cls: any) => (
                      <option key={cls.id || cls} value={cls.name || cls}>{cls.name || cls}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    required
                    value={editForm.class_name || ""} 
                    onChange={e => setEditForm({...editForm, class_name: e.target.value})}
                    placeholder="Enter class name (or configure in Profile)"
                    style={{ width: "100%", height: "48px", padding: "0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                )}
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "8px" }}>
                  New Password (Optional)
                </label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    value={editForm.password || ""} 
                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                    placeholder="Leave blank to keep current password"
                    style={{ width: "100%", height: "48px", padding: "0 100px 0 16px", borderRadius: "9px", border: "1px solid #DCE6F3", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#126BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(18, 107, 255, 0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#DCE6F3"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setEditForm({...editForm, password: Math.random().toString(36).slice(-8)})} 
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#126BFF", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ height: "1px", backgroundColor: "#E4ECF6", margin: "8px 0" }}></div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                type="button"
                onClick={() => navigate(`/teacher/students/${studentId}`)}
                style={{ height: "42px", padding: "0 20px", borderRadius: "9px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#0B1F3A", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                style={{ height: "42px", padding: "0 24px", borderRadius: "9px", background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, border: "none", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1, boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStudentProfile;
