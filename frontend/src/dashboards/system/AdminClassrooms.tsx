import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";
import SearchableSelect from "../../components/SearchableSelect";

type School = {
  id: number;
  name: string;
};

type Classroom = {
  id: number;
  name: string;
  school: number;
  school_name: string;
  is_active: boolean;
};

const AdminClassrooms = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("All Schools");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({ name: "", schoolId: "", isActive: true });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [classRes, schoolRes] = await Promise.all([
        fetch("/api/classes/classrooms/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/schools/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (classRes.ok) {
        const data = await classRes.json();
        setClassrooms(data.results || data);
      }
      if (schoolRes.ok) {
        const data = await schoolRes.json();
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
    setFormData({ name: "", schoolId: "", isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (classroom: Classroom) => {
    setModalMode("edit");
    setSelectedClassroom(classroom);
    setFormData({ name: classroom.name, schoolId: String(classroom.school), isActive: classroom.is_active });
    setShowModal(true);
  };

  const handleOpenDelete = (classroom: Classroom) => {
    setDeleteTarget(classroom);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    
    const payload = {
      name: formData.name,
      school: parseInt(formData.schoolId),
      is_active: formData.isActive
    };

    const url = modalMode === "create" ? "/api/classes/classrooms/" : `/api/classes/classrooms/${selectedClassroom?.id}/`;
    const method = modalMode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save classroom.");
      }
      setSuccess(modalMode === "create" ? "Classroom created successfully." : "Classroom updated successfully.");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/classes/classrooms/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete classroom.");
      setSuccess("Classroom deleted successfully.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredClassrooms = classrooms.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesSchool = filterSchool === "All Schools" || c.school_name === filterSchool;
    return matchesSearch && matchesSchool;
  });

  const columns: Column<Classroom>[] = [
    { key: "name", header: "Classroom Name", render: (item) => <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.name}</div> },
    { key: "school_name", header: "School", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.school_name}</span> },
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
            searchPlaceholder="Search classrooms..." 
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
          Create Classroom
        </button>
      </div>

      {success && <div style={{ padding: "12px", backgroundColor: "var(--success-light, #d1fae5)", color: "var(--success-dark, #065f46)", borderRadius: "8px" }}>{success}</div>}
      {error && <div style={{ padding: "12px", backgroundColor: "var(--danger-light, #fee2e2)", color: "var(--danger-dark, #991b1b)", borderRadius: "8px" }}>{error}</div>}

      <ChartCard title="Classroom Directory" subtitle="Manage classrooms across all schools">
        <div style={{ margin: "0 -20px" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
          ) : (
            <DataTable columns={columns} data={filteredClassrooms} keyExtractor={(c) => c.id} />
          )}
        </div>
      </ChartCard>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{modalMode === "create" ? "Create Classroom" : "Edit Classroom"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>School</label>
                <SearchableSelect 
                  options={schools.map(s => ({ label: s.name, value: String(s.id) }))}
                  value={formData.schoolId}
                  onChange={(val) => setFormData({ ...formData, schoolId: val })}
                  placeholder="Select a school..."
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                <label htmlFor="isActive" style={{ fontSize: "14px", fontWeight: "500" }}>Active Classroom</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "10px 16px", backgroundColor: "var(--blue-600)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete Classroom</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: "10px 16px", backgroundColor: "var(--danger)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClassrooms;
