import React, { useEffect, useState, useMemo } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type School = { id: number; name: string };
type Classroom = { id: number; name: string; grade: string; school: number };
type Teacher = { 
  id: number; 
  first_name: string; 
  last_name: string; 
  email: string; 
  is_active: boolean; 
  school_id: number; 
  school_name: string;
  teacher_profile?: {
    classrooms?: Classroom[];
  };
};

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("All Schools");
  const [filterClassroom, setFilterClassroom] = useState("All Classrooms");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    schoolId: "",
    isActive: true,
    classrooms: [] as number[],
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New classroom state
  const [showNewClassroom, setShowNewClassroom] = useState(false);
  const [newClassroomData, setNewClassroomData] = useState({ name: "", grade: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [tRes, sRes, cRes] = await Promise.all([
        fetch("/api/accounts/users/?role=TEACHER", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/schools/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/classes/classrooms/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (!tRes.ok || !sRes.ok || !cRes.ok) throw new Error("Failed to load data.");
      
      const tData = await tRes.json();
      const sData = await sRes.json();
      const cData = await cRes.json();
      
      setTeachers(tData.results || tData);
      setSchools(sData.results || sData);
      setClassrooms(cData.results || cData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredClassrooms = useMemo(() => {
    if (!formData.schoolId) return [];
    return classrooms.filter(c => c.school === Number(formData.schoolId));
  }, [classrooms, formData.schoolId]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ firstName: "", lastName: "", email: "", password: "", schoolId: "", isActive: true, classrooms: [] });
    setShowModal(true);
    setShowNewClassroom(false);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setModalMode("edit");
    setSelectedTeacher(teacher);
    setFormData({ 
      firstName: teacher.first_name, 
      lastName: teacher.last_name, 
      email: teacher.email, 
      password: "", 
      schoolId: teacher.school_id?.toString() || "", 
      isActive: teacher.is_active,
      classrooms: teacher.teacher_profile?.classrooms?.map(c => c.id) || []
    });
    setShowModal(true);
    setShowNewClassroom(false);
  };

  const handleOpenDelete = (teacher: Teacher) => {
    setDeleteTarget(teacher);
    setShowDeleteModal(true);
  };

  const handleClassroomToggle = (classId: number) => {
    setFormData(prev => ({
      ...prev,
      classrooms: prev.classrooms.includes(classId)
        ? prev.classrooms.filter(id => id !== classId)
        : [...prev.classrooms, classId]
    }));
  };

  const handleCreateNewClassroom = async () => {
    if (!newClassroomData.name.trim() || !newClassroomData.grade.trim() || !formData.schoolId) return;
    const token = getToken();
    setActionLoading(true);
    try {
      const res = await fetch("/api/classes/classrooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          name: newClassroomData.name,
          grade: newClassroomData.grade,
          school: Number(formData.schoolId)
        })
      });
      if (!res.ok) throw new Error("Failed to create classroom");
      const newClass = await res.json();
      setClassrooms([...classrooms, newClass]);
      setFormData(prev => ({ ...prev, classrooms: [...prev.classrooms, newClass.id] }));
      setNewClassroomData({ name: "", grade: "" });
      setShowNewClassroom(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    setError("");
    setSuccess("");
    const token = getToken();
    
    setActionLoading(true);

    const payload: any = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      school_id: formData.schoolId ? Number(formData.schoolId) : null,
      is_active: formData.isActive,
      role: "TEACHER",
      classrooms: formData.classrooms
    };

    if (formData.password) payload.password = formData.password;

    const url = modalMode === "create" ? "/api/accounts/users/" : `/api/accounts/users/${selectedTeacher?.id}/`;
    const method = modalMode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save teacher.");
      }
      setSuccess(modalMode === "create" ? "Teacher created successfully." : "Teacher updated successfully.");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete teacher.");
      setSuccess("Teacher deleted successfully.");
      setShowDeleteModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const query = search.toLowerCase();
    const matchesSearch = 
      (t.first_name || "").toLowerCase().includes(query) || 
      (t.last_name || "").toLowerCase().includes(query) || 
      (t.email || "").toLowerCase().includes(query);
    const matchesSchool = filterSchool === "All Schools" || t.school_name === filterSchool;
    const matchesClassroom = filterClassroom === "All Classrooms" || (t.teacher_profile?.classrooms || []).some(c => c.name === filterClassroom);
    return matchesSearch && matchesSchool && matchesClassroom;
  });

  const columns: Column<Teacher>[] = [
    { key: "name", header: "Teacher Name", render: (item) => <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.first_name} {item.last_name}</div> },
    { key: "email", header: "Email", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.email}</span> },
    { key: "school", header: "School", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.school_name || "-"}</span> },
    { key: "status", header: "Status", render: (item) => (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", backgroundColor: item.is_active ? "var(--success-light, #d1fae5)" : "var(--danger-light, #fee2e2)", color: item.is_active ? "var(--success-dark, #065f46)" : "var(--danger-dark, #991b1b)" }}>
        {item.is_active ? "Active" : "Archived"}
      </span>
    )},
    { key: "actions", header: "", render: (item) => (
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button onClick={() => handleOpenEdit(item)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Edit</button>
        <button onClick={() => handleOpenDelete(item)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--danger)", backgroundColor: "white", color: "var(--danger)", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Delete</button>
      </div>
    )}
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, maxWidth: "600px" }}>
          <FilterBar 
            searchPlaceholder="Search by name or email..." 
            searchValue={search} 
            onSearchChange={setSearch} 
            filters={[
              {
                label: "School",
                value: filterSchool,
                options: [{ label: "All Schools", value: "All Schools" }, ...schools.map(s => ({ label: s.name, value: s.name }))],
                onChange: (val) => { setFilterSchool(val); setFilterClassroom("All Classrooms"); }
              },
              {
                label: "Classroom",
                value: filterClassroom,
                options: [{ label: "All Classrooms", value: "All Classrooms" }, ...classrooms.filter(c => filterSchool === "All Schools" || c.school === schools.find(s => s.name === filterSchool)?.id).map(c => ({ label: c.name, value: c.name }))],
                onChange: setFilterClassroom
              }
            ]}
          />
        </div>
        <button onClick={handleOpenCreate} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
          Create Teacher
        </button>
      </div>

      {success && <div style={{ padding: "12px", backgroundColor: "var(--success-light, #d1fae5)", color: "var(--success-dark, #065f46)", borderRadius: "8px" }}>{success}</div>}
      {error && <div style={{ padding: "12px", backgroundColor: "var(--danger-light, #fee2e2)", color: "var(--danger-dark, #991b1b)", borderRadius: "8px" }}>{error}</div>}

      <ChartCard title="Teacher Directory" subtitle="Manage all teachers across schools">
        <div style={{ margin: "0 -20px" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
          ) : (
            <DataTable columns={columns} data={filteredTeachers} keyExtractor={(c) => c.id} />
          )}
        </div>
      </ChartCard>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{modalMode === "create" ? "Create Teacher" : "Edit Teacher"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>First Name *</label>
                  <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Last Name *</label>
                  <input required type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Email *</label>
                <input required disabled={modalMode === "edit"} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none", backgroundColor: modalMode === "edit" ? "var(--background)" : "white" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Password {modalMode === "create" ? "*" : ""}</label>
                <input required={modalMode === "create"} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={modalMode === "edit" ? "Leave blank to keep current password" : ""} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>School *</label>
                <select required value={formData.schoolId} onChange={e => setFormData({ ...formData, schoolId: e.target.value, classrooms: [] })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }}>
                  <option value="">Select a school</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {formData.schoolId && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500" }}>Class Assignments</label>
                    <button type="button" onClick={() => setShowNewClassroom(!showNewClassroom)} style={{ background: "none", border: "none", color: "var(--blue-600)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                      + New Classroom
                    </button>
                  </div>
                  
                  {showNewClassroom && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px", padding: "12px", backgroundColor: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <input type="text" placeholder="Class Name" value={newClassroomData.name} onChange={e => setNewClassroomData({...newClassroomData, name: e.target.value})} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none", fontSize: "13px" }} />
                      <input type="text" placeholder="Grade" value={newClassroomData.grade} onChange={e => setNewClassroomData({...newClassroomData, grade: e.target.value})} style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", outline: "none", fontSize: "13px" }} />
                      <button type="button" onClick={handleCreateNewClassroom} style={{ padding: "8px 12px", backgroundColor: "var(--navy-950)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Add</button>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--surface)" }}>
                    {filteredClassrooms.length > 0 ? (
                      filteredClassrooms.map(c => (
                        <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formData.classrooms.includes(c.id)} 
                            onChange={() => handleClassroomToggle(c.id)}
                          />
                          {c.name} {c.grade ? `(Grade ${c.grade})` : ""}
                        </label>
                      ))
                    ) : (
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>No classrooms available for this school.</span>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                <label htmlFor="isActive" style={{ fontSize: "14px", fontWeight: "500" }}>Active Account</label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
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
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete Teacher</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button disabled={deleteLoading} onClick={handleDelete} style={{ padding: "10px 16px", backgroundColor: "var(--danger)", color: "white", border: "none", borderRadius: "8px", cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;
