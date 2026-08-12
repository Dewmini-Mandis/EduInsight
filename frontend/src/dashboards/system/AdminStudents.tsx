import React, { useEffect, useState } from "react";
import { getToken } from "../../auth/authUtils";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type School = { id: number; name: string };

type Student = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  school_id: number;
  school: string; // From API
  student_profile?: {
    index_no?: string;
    class_name?: string;
    grade?: string;
  };
  is_active: boolean;
  role: string;
};

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("All Schools");

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
        setStudents(usersList.filter((u: any) => u.role === "STUDENT" || u.role?.role_name === "STUDENT"));
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

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || 
                          (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
                          (s.student_profile?.index_no || "").toLowerCase().includes(search.toLowerCase());
    const schoolName = s.school || schools.find(sch => sch.id === s.school_id)?.name || "";
    const matchesSchool = filterSchool === "All Schools" || schoolName === filterSchool;
    return matchesSearch && matchesSchool;
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
    { key: "school", header: "School", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.school || schools.find(sch => sch.id === item.school_id)?.name || "-"}</span> },
    { key: "class", header: "Class / Grade", render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.student_profile?.class_name || "-"} {item.student_profile?.grade ? `(Grade ${item.student_profile.grade})` : ""}</span> },
    { key: "status", header: "Status", render: (item) => (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", backgroundColor: item.is_active ? "var(--success-light, #d1fae5)" : "var(--danger-light, #fee2e2)", color: item.is_active ? "var(--success-dark, #065f46)" : "var(--danger-dark, #991b1b)" }}>
        {item.is_active ? "Active" : "Archived"}
      </span>
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
            filters={[{
              label: "School",
              value: filterSchool,
              options: [{ label: "All Schools", value: "All Schools" }, ...schools.map(s => ({ label: s.name, value: s.name }))],
              onChange: setFilterSchool
            }]}
          />
        </div>
      </div>

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
    </div>
  );
};

export default AdminStudents;
