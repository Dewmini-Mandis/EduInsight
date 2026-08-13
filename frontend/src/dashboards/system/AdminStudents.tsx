import React, { useEffect, useState, useMemo } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type School = { id: number; name: string };
type Classroom = { id: number; name: string; grade: string; school: number };

type Student = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  school_id: number;
  school_name: string;
  student_profile?: {
    index_no?: string;
    class_name?: string;
    grade?: string;
    class_room?: { id: number, name: string };
  };
  is_active: boolean;
  role: string;
};

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [success, setSuccess] = useState("");
  
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("All Schools");
  const [filterClassroom, setFilterClassroom] = useState("All Classrooms");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    schoolId: "",
    indexNo: "",
    classRoomId: "",
    isActive: true,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, schoolsRes, classesRes] = await Promise.all([
        fetch("/api/accounts/users/?role=STUDENT", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/schools/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/classes/classrooms/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setStudents(data.results || data);
      }
      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        setSchools(data.results || data);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClassrooms(data.results || data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFormClassrooms = useMemo(() => {
    if (!formData.schoolId) return [];
    return classrooms.filter(c => c.school === Number(formData.schoolId));
  }, [classrooms, formData.schoolId]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setModalError("");
    setModalSuccess("");
    setFormData({ firstName: "", lastName: "", email: "", password: "", schoolId: "", indexNo: "", classRoomId: "", isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setModalMode("edit");
    setModalError("");
    setModalSuccess("");
    setSelectedStudent(student);
    setFormData({ 
      firstName: student.first_name, 
      lastName: student.last_name, 
      email: student.email, 
      password: "", 
      schoolId: student.school_id?.toString() || "", 
      indexNo: student.student_profile?.index_no || "",
      classRoomId: student.student_profile?.class_room?.id?.toString() || "",
      isActive: student.is_active
    });
    setShowModal(true);
  };

  const handleOpenDelete = (student: Student) => {
    setDeleteTarget(student);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim() || (modalMode === "create" && !formData.password) || !formData.schoolId || !formData.classRoomId) {
      setModalError("Please fill in all required fields, including Class Assignment.");
      return;
    }
    setModalError("");
    setModalSuccess("");
    setError("");
    setSuccess("");
    const token = getToken();
    
    setActionLoading(true);

    const username = formData.email.split("@")[0] + Math.floor(Math.random() * 1000);

    const payload: any = {
      username,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      school_id: formData.schoolId ? Number(formData.schoolId) : null,
      is_active: formData.isActive,
      role: "STUDENT",
      index_no: formData.indexNo.trim(),
    };
    if (formData.classRoomId) {
       payload.class_room_id = Number(formData.classRoomId);
    }

    if (formData.password) payload.password = formData.password;

    const url = modalMode === "create" ? "/api/accounts/users/" : `/api/accounts/users/${selectedStudent?.id}/`;
    const method = modalMode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.email?.[0] || "Failed to save student.");
      }
      setModalSuccess(modalMode === "create" ? "Student created successfully." : "Student updated successfully.");
      fetchData();
      setShowModal(false);
      setModalSuccess("");
    } catch (err: any) {
      setModalError(err.message);
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
      if (!res.ok) throw new Error("Failed to delete student.");
      setSuccess("Student deleted successfully.");
      setShowDeleteModal(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || 
                          (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
                          (s.student_profile?.index_no || "").toLowerCase().includes(search.toLowerCase());
    const schoolName = s.school_name || schools.find(sch => sch.id === s.school_id)?.name || "";
    const matchesSchool = filterSchool === "All Schools" || schoolName === filterSchool;
    
    const className = s.student_profile?.class_room?.name || s.student_profile?.class_name || "";
    const matchesClassroom = filterClassroom === "All Classrooms" || className === filterClassroom;
    
    return matchesSearch && matchesSchool && matchesClassroom;
  });

  const columns: Column<Student>[] = [
    { key: "name", header: "Student Name", render: (item) => (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--blue-100)", color: "var(--blue-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>
          {item.first_name?.charAt(0)}{item.last_name?.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.first_name} {item.last_name}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{item.email}</div>
        </div>
      </div>
    )},
    { key: "index", header: "Index Number", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.student_profile?.index_no || "-"}</span> },
    { key: "school", header: "School", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.school_name || schools.find(sch => sch.id === item.school_id)?.name || "-"}</span> },
    { key: "class", header: "Class / Grade", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.student_profile?.class_room?.name || item.student_profile?.class_name || "-"} {item.student_profile?.grade ? `(Grade ${item.student_profile.grade})` : ""}</span> },
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
            searchPlaceholder="Search by name, email, or index no..." 
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
          Create Student
        </button>
      </div>

      {success && <div style={{ padding: "12px", backgroundColor: "var(--success-light, #d1fae5)", color: "var(--success-dark, #065f46)", borderRadius: "8px" }}>{success}</div>}
      {error && <div style={{ padding: "12px", backgroundColor: "var(--danger-light, #fee2e2)", color: "var(--danger-dark, #991b1b)", borderRadius: "8px" }}>{error}</div>}

      <ChartCard title="Student Directory" subtitle="View all registered students across schools">
        <div style={{ margin: "0 -20px" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
          ) : (
            <DataTable columns={columns} data={filteredStudents} keyExtractor={(c) => c.id} />
          )}
        </div>
      </ChartCard>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{modalMode === "create" ? "Create Student" : "Edit Student"}</h3>
            {modalError && <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "var(--danger-light, #fee2e2)", color: "var(--danger-dark, #991b1b)", borderRadius: "8px" }}>{modalError}</div>}
            {modalSuccess && <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "var(--success-light, #d1fae5)", color: "var(--success-dark, #065f46)", borderRadius: "8px" }}>{modalSuccess}</div>}
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
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Index Number</label>
                <input type="text" value={formData.indexNo} onChange={e => setFormData({ ...formData, indexNo: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>School *</label>
                <select required value={formData.schoolId} onChange={e => setFormData({ ...formData, schoolId: e.target.value, classRoomId: "" })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }}>
                  <option value="">Select a school</option>
                  {schools.map(s => <option key={s.id} value={s.id.toString()}>{s.name}</option>)}
                </select>
              </div>

              {formData.schoolId && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Class Assignment *</label>
                  <select required value={formData.classRoomId} onChange={e => setFormData({ ...formData, classRoomId: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }}>
                    <option value="">Select a classroom</option>
                    {filteredFormClassrooms.map(c => <option key={c.id} value={c.id.toString()}>{c.name} {c.grade ? `(Grade ${c.grade})` : ""}</option>)}
                  </select>
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
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete Student</h3>
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

export default AdminStudents;
