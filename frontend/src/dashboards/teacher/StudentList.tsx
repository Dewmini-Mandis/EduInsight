import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import FilterBar from "../../components/FilterBar";

type StudentItem = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  index_no: string;
  class_name: string;
  initials?: string;
};

const StudentList = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All Classes");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const token = getToken();
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // The endpoint might return { results: [...] } or [...] depending on pagination.
        const users = data.results || data;
        
        // Add full_name and initials if not present
        const processedUsers = users.map((u: any) => {
          const fn = u.first_name || "";
          const ln = u.last_name || "";
          return {
            ...u,
            full_name: `${fn} ${ln}`.trim(),
            initials: `${fn.charAt(0) || ""}${ln.charAt(0) || ""}`.toUpperCase(),
            index_no: u.student_profile?.index_no || "",
            class_name: u.student_profile?.class_room?.name || u.student_profile?.class_name || ""
          };
        });
        
        setStudents(processedUsers);
      } else {
        setError("Failed to fetch students");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      (student.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      student.username.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase()) ||
      (student.index_no || "").toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "All Classes" || (student.class_name && student.class_name === filterClass);
    return matchesSearch && matchesClass;
  });

  const columns: Column<StudentItem>[] = [
    {
      key: "full_name",
      header: "Full Name",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "32px", height: "32px", borderRadius: "50%", 
            backgroundColor: "var(--blue-100)", color: "var(--blue-600)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: "12px", fontWeight: "600" 
          }}>
            {item.initials || "ST"}
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.full_name || `${item.first_name} ${item.last_name}`}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{item.email}</div>
          </div>
        </div>
      )
    },
    {
      key: "index_no",
      header: "Index Number",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.index_no || "N/A"}</span>
    },
    {
      key: "class_name",
      header: "Classroom",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.class_name || "N/A"}</span>
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={() => navigate(`/teacher/students/${item.id}`)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            Details
          </button>
          <button
            onClick={() => navigate(`/teacher/students/${item.id}/progress`)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "none", backgroundColor: "rgba(101, 61, 245, 0.1)", color: "var(--purple)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            Progress
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading student registry...</div>;
  if (error) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, maxWidth: "600px" }}>
          <FilterBar 
            searchPlaceholder="Search by name, email, or index..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                label: "Class",
                value: filterClass,
                options: [
                  { label: "All Classes", value: "All Classes" },
                  { label: "Grade 10 - Mathematics", value: "Grade 10 - Mathematics" },
                  { label: "Grade 10A - Mathematics", value: "Grade 10A - Mathematics" },
                  { label: "Grade 10 - Physics", value: "Grade 10 - Physics" }
                ],
                onChange: setFilterClass
              }
            ]}
          />
        </div>
        
        <button 
          onClick={() => navigate("/teacher/students/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Add Student
        </button>
      </div>

      {/* Registry Card */}
      <ChartCard title="Student Registry" subtitle="Manage your enrolled students">
        <div style={{ margin: "0 -20px" }}>
          <DataTable columns={columns} data={filteredStudents} keyExtractor={(s) => s.id} />
        </div>
      </ChartCard>

    </div>
  );
};

export default StudentList;
