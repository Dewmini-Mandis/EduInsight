import React, { useEffect, useState, useMemo } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type Classroom = {
  id: number;
  name: string;
  grade: string;
  school: number;
};

type School = {
  id: number;
  name: string;
  address: string;
  province: string;
  district: string;
  zone: string;
  educational_zone: string;
  classrooms?: Classroom[];
};

const AdminSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterProvince, setFilterProvince] = useState("All Provinces");
  const [filterDistrict, setFilterDistrict] = useState("All Districts");

  // School Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    zone: "",
    educational_zone: "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  // Classroom Modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [classModalMode, setClassModalMode] = useState<"create" | "edit">("create");
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [classFormData, setClassFormData] = useState({ name: "", grade: "" });

  const [showClassDeleteModal, setShowClassDeleteModal] = useState(false);
  const [deleteClassTarget, setDeleteClassTarget] = useState<Classroom | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [resSchools, resClasses] = await Promise.all([
        fetch("/api/schools/", { headers: { Authorization: `Token ${token}` } }),
        fetch("/api/classes/classrooms/", { headers: { Authorization: `Token ${token}` } })
      ]);
      
      if (!resSchools.ok || !resClasses.ok) {
        throw new Error("Failed to load data.");
      }

      const schoolsData = await resSchools.json();
      const classesData = await resClasses.json();
      
      const sList = schoolsData.results || schoolsData;
      const cList = classesData.results || classesData;
      
      setAllClassrooms(cList);
      
      const merged = sList.map((s: School) => ({
        ...s,
        classrooms: cList.filter((c: Classroom) => c.school === s.id)
      }));
      setSchools(merged);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SCHOOL HANDLERS ---
  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ name: "", address: "", province: "", district: "", zone: "", educational_zone: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (school: School) => {
    setModalMode("edit");
    setSelectedSchool(school);
    setFormData({ 
      name: school.name || "", 
      address: school.address || "", 
      province: school.province || "", 
      district: school.district || "", 
      zone: school.zone || "", 
      educational_zone: school.educational_zone || "" 
    });
    setShowModal(true);
  };

  const handleOpenDelete = (school: School) => {
    setDeleteTarget(school);
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

    const payload = {
      name: formData.name.trim(),
      location: formData.address.trim() || formData.name.trim(), // Required field
      address: formData.address.trim(),
      province: formData.province.trim(),
      district: formData.district.trim(),
      zone: formData.zone.trim(),
      educational_zone: formData.educational_zone.trim(),
    };

    const url = modalMode === "create" ? "/api/schools/" : `/api/schools/${selectedSchool?.id}/`;
    const method = modalMode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save school.");
      }
      setSuccess(modalMode === "create" ? "School created successfully." : "School updated successfully.");
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
      const res = await fetch(`/api/schools/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete school.");
      setSuccess("School deleted successfully.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- CLASSROOM HANDLERS ---
  const handleOpenCreateClass = (schoolId: number) => {
    setActiveSchoolId(schoolId);
    setClassModalMode("create");
    setClassFormData({ name: "", grade: "" });
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls: Classroom) => {
    setActiveSchoolId(cls.school);
    setClassModalMode("edit");
    setSelectedClass(cls);
    setClassFormData({ name: cls.name, grade: cls.grade });
    setShowClassModal(true);
  };

  const handleOpenDeleteClass = (cls: Classroom) => {
    setDeleteClassTarget(cls);
    setShowClassDeleteModal(true);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading || !activeSchoolId) return;
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    
    setActionLoading(true);

    const payload = {
      name: classFormData.name.trim(),
      grade: classFormData.grade.trim(),
      school: activeSchoolId
    };

    const url = classModalMode === "create" ? "/api/classes/classrooms/" : `/api/classes/classrooms/${selectedClass?.id}/`;
    const method = classModalMode === "create" ? "POST" : "PATCH";

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
      setSuccess(classModalMode === "create" ? "Classroom created successfully." : "Classroom updated successfully.");
      setShowClassModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClassDelete = async () => {
    if (!deleteClassTarget) return;
    if (deleteLoading) return;
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/classes/classrooms/${deleteClassTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete classroom.");
      setSuccess("Classroom deleted successfully.");
      setShowClassDeleteModal(false);
      setDeleteClassTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };


  const provinces = useMemo(() => {
    const p = new Set<string>();
    schools.forEach(s => s.province && p.add(s.province));
    return Array.from(p).sort();
  }, [schools]);

  const districts = useMemo(() => {
    const d = new Set<string>();
    schools.forEach(s => s.district && d.add(s.district));
    return Array.from(d).sort();
  }, [schools]);

  const filteredSchools = schools.filter(s => {
    const query = search.toLowerCase();
    const matchesSearch = 
      (s.name || "").toLowerCase().includes(query) || 
      (s.address || "").toLowerCase().includes(query) ||
      (s.zone || "").toLowerCase().includes(query);
    const matchesProvince = filterProvince === "All Provinces" || s.province === filterProvince;
    const matchesDistrict = filterDistrict === "All Districts" || s.district === filterDistrict;
    return matchesSearch && matchesProvince && matchesDistrict;
  });

  const classColumns: Column<Classroom>[] = [
    { key: "name", header: "Class Name", width: "40%", render: (item) => <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.name}</div> },
    { key: "grade", header: "Grade", width: "30%", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.grade || "-"}</span> },
    { key: "actions", header: "Actions", width: "30%", render: (item) => (
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={() => handleOpenEditClass(item)} style={{ background: "none", border: "none", color: "var(--blue-600)", cursor: "pointer", fontSize: "13px", fontWeight: "500", padding: 0 }}>Edit</button>
        <button onClick={() => handleOpenDeleteClass(item)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px", fontWeight: "500", padding: 0 }}>Delete</button>
      </div>
    )}
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, maxWidth: "800px" }}>
          <FilterBar 
            searchPlaceholder="Search schools..." 
            searchValue={search} 
            onSearchChange={setSearch} 
            filters={[
              {
                label: "Province",
                value: filterProvince,
                options: [{ label: "All Provinces", value: "All Provinces" }, ...provinces.map(p => ({ label: p, value: p }))],
                onChange: setFilterProvince
              },
              {
                label: "District",
                value: filterDistrict,
                options: [{ label: "All Districts", value: "All Districts" }, ...districts.map(d => ({ label: d, value: d }))],
                onChange: setFilterDistrict
              }
            ]}
          />
        </div>
        <button onClick={handleOpenCreate} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", marginLeft: "16px" }}>
          Register School
        </button>
      </div>

      {success && <div style={{ padding: "12px", backgroundColor: "var(--success-light, #d1fae5)", color: "var(--success-dark, #065f46)", borderRadius: "8px" }}>{success}</div>}
      {error && <div style={{ padding: "12px", backgroundColor: "var(--danger-light, #fee2e2)", color: "var(--danger-dark, #991b1b)", borderRadius: "8px" }}>{error}</div>}

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {filteredSchools.map((school) => (
            <ChartCard 
              key={school.id} 
              title={school.name}
              subtitle={`${school.address || "No address"} • ${school.province} Province • ${school.district} District`}
              headerAction={
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleOpenCreateClass(school.id)} style={{ padding: "8px 16px", backgroundColor: "var(--blue-600)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                    Add Classroom
                  </button>
                  <button onClick={() => handleOpenEdit(school)} style={{ padding: "8px 16px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                    Edit School
                  </button>
                  <button onClick={() => handleOpenDelete(school)} style={{ padding: "8px 16px", backgroundColor: "white", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                    Delete
                  </button>
                </div>
              }
            >
              <div style={{ margin: "0 -20px" }}>
                {school.classrooms && school.classrooms.length > 0 ? (
                  <DataTable columns={classColumns} data={school.classrooms} keyExtractor={(c) => c.id} />
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                    No classrooms found for this school.
                  </div>
                )}
              </div>
            </ChartCard>
          ))}
          {filteredSchools.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", backgroundColor: "var(--surface)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
              No schools found matching your criteria.
            </div>
          )}
        </div>
      )}

      {/* Modals for School... */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "500px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{modalMode === "create" ? "Register School" : "Edit School"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>School Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Province *</label>
                  <input required type="text" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>District *</label>
                  <input required type="text" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Educational Zone</label>
                  <input type="text" value={formData.educational_zone} onChange={e => setFormData({ ...formData, educational_zone: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Zone</label>
                  <input type="text" value={formData.zone} onChange={e => setFormData({ ...formData, zone: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={actionLoading} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
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
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete School</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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

      {/* Modals for Classroom... */}
      {showClassModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 24px 0" }}>{classModalMode === "create" ? "Add Classroom" : "Edit Classroom"}</h3>
            <form onSubmit={handleClassSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Class Name *</label>
                <input required type="text" value={classFormData.name} onChange={e => setClassFormData({ ...classFormData, name: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Grade *</label>
                <input required type="text" value={classFormData.grade} onChange={e => setClassFormData({ ...classFormData, grade: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setShowClassModal(false)} disabled={actionLoading} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: "10px 16px", backgroundColor: "var(--blue-600)", color: "white", border: "none", borderRadius: "8px", cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}>
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClassDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--danger)" }}>Delete Classroom</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to delete <strong>{deleteClassTarget?.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowClassDeleteModal(false)} style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              <button disabled={deleteLoading} onClick={handleClassDelete} style={{ padding: "10px 16px", backgroundColor: "var(--danger)", color: "white", border: "none", borderRadius: "8px", cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchools;
