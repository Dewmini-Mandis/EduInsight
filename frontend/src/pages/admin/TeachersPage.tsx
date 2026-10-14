import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, UserPlus } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import TeacherPageHeader from "../../components/teachers/TeacherPageHeader";
import TeacherSearch from "../../components/teachers/TeacherSearch";
import TeacherDirectory from "../../components/teachers/TeacherDirectory";
import DeleteTeacherModal from "../../components/teachers/DeleteTeacherModal";
import { TeacherData } from "../../components/teachers/TeacherRow";

import "../../styles/admin-teachers.css";

interface TeachersPageProps {
  onNavigateCreate?: () => void;
  onNavigateEdit?: (teacher: TeacherData) => void;
}

const TeachersPage: React.FC<TeachersPageProps> = ({ onNavigateCreate, onNavigateEdit }) => {
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<TeacherData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accounts/users/?role=TEACHER", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load teacher accounts.");
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      setError(err.message || "Error loading teachers.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    if (onNavigateCreate) {
      onNavigateCreate();
    } else {
      navigate("/system-admin/teachers/create");
    }
  };

  const handleEditClick = (teacher: TeacherData) => {
    if (onNavigateEdit) {
      onNavigateEdit(teacher);
    } else {
      navigate(`/system-admin/teachers/edit/${teacher.id}`, { state: { teacher } });
    }
  };

  const handleDeleteOpen = (teacher: TeacherData) => {
    setDeleteTarget(teacher);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError("");
    setSuccess("");
    const token = getToken();

    try {
      const res = await fetch(`/api/accounts/users/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete teacher account.");

      setSuccess(`Teacher account "${deleteTarget.first_name} ${deleteTarget.last_name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchTeachers();
    } catch (err: any) {
      setError(err.message || "Failed to delete teacher.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    const fullName = `${t.first_name || ""} ${t.last_name || ""}`.toLowerCase();
    const email = (t.email || "").toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="admin-teacher-page-container">
      <TeacherPageHeader
        icon={<UserCheck size={28} />}
        title="Manage Teachers"
        subtitle="Manage teacher accounts and access."
        rightActions={
          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleCreateClick}
          >
            <UserPlus size={18} />
            Create Teacher
          </button>
        }
      />

      {success && <div className="admin-alert-success">{success}</div>}
      {error && <div className="admin-alert-error">{error}</div>}

      <TeacherSearch
        value={search}
        onChange={setSearch}
        placeholder="Search teacher by name or email..."
      />

      <TeacherDirectory
        teachers={filteredTeachers}
        loading={loading}
        onEdit={handleEditClick}
        onDelete={handleDeleteOpen}
      />

      <DeleteTeacherModal
        teacher={deleteTarget}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default TeachersPage;
