import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type School = { id: number; name: string };

type Teacher = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  school_id: number;
  school: string; // From API it might come as school (name)
  is_active: boolean;
  role: string;
};

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("All Schools");

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
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, schoolsRes] = await Promise.all([
        fetch("/api/accounts/users/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/schools/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        const usersList = data.results || data;
        setTeachers(usersList.filter((u: any) => u.role === "TEACHER" || u.role?.role_name === "TEACHER"));
      }
      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        setSchools(data.results || data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ firstName: "", lastName: "", email: "", password: "", schoolId: "", isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setModalMode("edit");
    setSelectedTeacher(teacher);
    setFormData({ 
      firstName: teacher.first_name || "", 
      lastName: teacher.last_name || "", 
      email: teacher.email || "", 
      password: "", 
      schoolId: teacher.school_id ? String(teacher.school_id) : "", 
      isActive: teacher.is_active 
    });
    setShowModal(true);
  };

  const handleOpenDelete = (teacher: Teacher) => {
    setDeleteTarget(teacher);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    
    setActionLoading(true);
    const payload: any = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      school_id: parseInt(formData.schoolId),
      is_active: formData.isActive
    };

    if (modalMode === "create") {
      payload.email = formData.email;
      payload.username = formData.email;
      payload.role = "TEACHER";
    }
    
    if (formData.password) {
      payload.password = formData.password;
    }

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
    if (deleteLoading) return;
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/accounts/users/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete teacher.");
      setSuccess("Teacher deleted successfully.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase());
    const schoolName = t.school || schools.find(s => s.id === t.school_id)?.name || "";
    const matchesSchool = filterSchool === "All Schools" || schoolName === filterSchool;
    return matchesSearch && matchesSchool;
  });

  const columns: Column<Teacher>[] = [
    { key: "name", header: "Teacher Name", render: (item) => (
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
    { key: "school", header: "School", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.school || schools.find(s => s.id === item.school_id)?.name || "-"}</span> },
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
            filters={[{
              label: "School",
              value: filterSchool,
              options: [{ label: "All Schools", value: "All Schools" }, ...schools.map(s => ({ label: s.name, value: s.name }))],
              onChange: setFilterSchool
            }]}
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
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
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
                <select required value={formData.schoolId} onChange={e => setFormData({ ...formData, schoolId: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }}>
                  <option value="">Select a school</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
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
