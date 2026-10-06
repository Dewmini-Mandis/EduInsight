import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import StudentPageHeader from "../../components/students/StudentPageHeader";
import StudentSearchFilters from "../../components/students/StudentSearchFilters";
import StudentDirectoryTable from "../../components/students/StudentDirectoryTable";
import DeleteStudentModal from "../../components/students/DeleteStudentModal";
import { StudentItem } from "../../components/students/StudentRow";

import "../../styles/admin-students.css";

const StudentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: number; name: string; grade?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("All Classes");
  const [selectedStatus, setSelectedStatus] = useState("All Status");

  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, classesRes] = await Promise.all([
        fetch("/api/accounts/users/?role=STUDENT", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/classes/classrooms/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setStudents(data.results || data);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClassrooms(data.results || data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load students data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: StudentItem) => {
    navigate(`/system-admin/students/edit/${student.id}`);
  };

  const handleDeleteOpen = (student: StudentItem) => {
    setDeleteTarget(student);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete student account.");
      }

      setSuccess(`Student ${deleteTarget.first_name} ${deleteTarget.last_name} deleted successfully.`);
      setDeleteTarget(null);
      fetchData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to delete student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const email = (s.email || "").toLowerCase();
      const indexNo = (s.student_profile?.index_no || "").toLowerCase();
      const searchLower = search.toLowerCase().trim();

      const matchesSearch =
        !searchLower ||
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        indexNo.includes(searchLower);

      const className = s.student_profile?.class_room?.name || s.student_profile?.class_name || "";
      const matchesClass =
        selectedClassroom === "All Classes" || className === selectedClassroom;

      const matchesStatus =
        selectedStatus === "All Status" ||
        (selectedStatus === "Active" && s.is_active) ||
        (selectedStatus === "Inactive" && !s.is_active);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, search, selectedClassroom, selectedStatus]);

  const breadcrumbs = [
    { label: "Dashboard", path: "/system-admin/dashboard" },
    { label: "Students" },
  ];

  return (
    <div className="admin-student-page-container">
      <StudentPageHeader
        breadcrumbs={breadcrumbs}
        icon={<Users size={28} />}
        title="Student Directory"
        subtitle="View enrolled students and profiles."
        rightActions={
          <button
            type="button"
            className="admin-btn-primary"
            onClick={() => navigate("/system-admin/students/create")}
          >
            <UserPlus size={18} />
            Create Student
          </button>
        }
      />

      {success && <div className="admin-alert-success">{success}</div>}
      {error && <div className="admin-alert-error">{error}</div>}

      <StudentSearchFilters
        search={search}
        onSearchChange={setSearch}
        selectedClassroom={selectedClassroom}
        onClassroomChange={setSelectedClassroom}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        classrooms={classrooms}
      />

      <StudentDirectoryTable
        students={filteredStudents}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteOpen}
      />

      <DeleteStudentModal
        student={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
};

export default StudentsPage;
