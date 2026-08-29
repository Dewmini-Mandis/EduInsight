import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";

type MaterialItem = {
  id: number;
  title: string;
  material_type: "VIDEO" | "PDF" | "TEXT";
  lesson?: number;
  created_at: string;
};

const MaterialList = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch("/api/quizzes/materials/", { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        setMaterials(await res.json());
      } else {
        console.error("Failed to fetch materials");
      }
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      const token = getToken();
      try {
        const res = await fetch(`/api/quizzes/materials/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Token ${token}` }
        });
        if (res.ok) {
          fetchData();
        } else {
          alert("Failed to delete material.");
        }
      } catch (e) {
        alert("Error deleting material.");
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case "VIDEO": return { bg: "#e0e7ff", text: "#4338ca" };
      case "PDF": return { bg: "#fee2e2", text: "#b91c1c" };
      default: return { bg: "#f1f5f9", text: "#475569" };
    }
  };

  const columns: Column<MaterialItem>[] = [
    {
      key: "title",
      header: "Material Title",
      render: (item) => <span style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.title}</span>
    },
    {
      key: "material_type",
      header: "Type",
      render: (item) => {
        const colors = getTypeColor(item.material_type);
        return (
          <span style={{ backgroundColor: colors.bg, color: colors.text, padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>
            {item.material_type}
          </span>
        );
      }
    },
    {
      key: "created_at",
      header: "Created",
      render: (item) => <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{new Date(item.created_at).toLocaleDateString()}</span>
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={() => navigate(`/teacher/materials/${item.id}/preview`)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "var(--navy-950)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Preview
          </button>
          <button
            onClick={() => {
              if (item.material_type === "VIDEO") {
                navigate(`/teacher/materials/video/${item.id}/edit`);
              } else {
                navigate(`/teacher/materials/note/${item.id}/edit`);
              }
            }}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--blue-600)", backgroundColor: "transparent", color: "var(--blue-600)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(245, 34, 61, 0.2)", backgroundColor: "rgba(245, 34, 61, 0.05)", color: "var(--danger)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading materials...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <button 
          onClick={() => navigate("/teacher/materials/video/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Upload Video
        </button>
        <button 
          onClick={() => navigate("/teacher/materials/note/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--blue-600)", backgroundColor: "white", color: "var(--blue-600)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Create Note
        </button>
      </div>

      <ChartCard title="Learning Materials" subtitle="Manage and assign materials">
        <div style={{ margin: "0 -20px" }}>
          {materials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No materials uploaded yet.</div>
          ) : (
            <DataTable columns={columns} data={materials} keyExtractor={(m) => m.id} />
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default MaterialList;
