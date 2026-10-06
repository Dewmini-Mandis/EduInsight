import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { UserCheck, Trash2, ArrowLeft } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import TeacherPageHeader from "../../components/teachers/TeacherPageHeader";
import TeacherForm, { TeacherFormData, ClassroomItem } from "../../components/teachers/TeacherForm";
import DeleteTeacherModal from "../../components/teachers/DeleteTeacherModal";
import { TeacherData } from "../../components/teachers/TeacherRow";

import "../../styles/admin-teachers.css";

interface EditTeacherPageProps {
  teacherData?: TeacherData | null;
  onBack?: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

const EditTeacherPage: React.FC<EditTeacherPageProps> = ({
  teacherData,
  onBack,
  onUpdated,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [teacher, setTeacher] = useState<TeacherData | null>(
    teacherData || (location.state as any)?.teacher || null
  );

  const initialClassroomIds: string[] =
    (teacher as any)?.teacher_profile?.classrooms?.map((c: any) => c.name || String(c.id)) || [];

  const [formData, setFormData] = useState<TeacherFormData>({
    firstName: teacher?.first_name || "",
    lastName: teacher?.last_name || "",
    email: teacher?.email || "",
    password: "",
    isActive: teacher?.is_active ?? true,
    classrooms: initialClassroomIds,
  });

  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchClassrooms();
    const teacherId = id || teacher?.id;
    if (teacherId) {
      fetchTeacherDetails(teacherId.toString());
    }
  }, [id]);

  const fetchClassrooms = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/classes/classrooms/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableClassrooms(data.results || data);
      }
    } catch (err) {
      console.error("Failed to fetch classrooms:", err);
    }
  };

  const fetchTeacherDetails = async (teacherId: string) => {
    const token = getToken();
    if (!token) return;
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/accounts/users/${teacherId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load teacher account details.");
      const data: TeacherData = await res.json();
      setTeacher(data);

      const assignedClasses: string[] =
        data.teacher_profile?.classrooms?.map((c: any) => c.name || String(c.id)) || [];

      setFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        password: "",
        isActive: data.is_active ?? true,
        classrooms: assignedClasses,
      });
    } catch (err: any) {
      setError(err.message || "Error loading teacher details.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/system-admin/teachers");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const teacherId = teacher?.id || id;
    if (!teacherId) {
      setError("Teacher ID is missing.");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    const token = getToken();

    const payload: any = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      is_active: formData.isActive,
      classrooms: formData.classrooms,
    };

    if (formData.password && formData.password.trim().length > 0) {
      if (formData.password.length < 8) {
        setError("New password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      payload.password = formData.password;
    }

    try {
      const res = await fetch(`/api/accounts/users/${teacherId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = "Failed to update teacher account.";
        if (errData.email) {
          message = Array.isArray(errData.email) ? errData.email.join(" ") : errData.email;
        } else if (errData.detail) {
          message = errData.detail;
        } else if (typeof errData === "object" && Object.keys(errData).length > 0) {
          message = Object.entries(errData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
        }
        throw new Error(message);
      }

      setSuccess("Teacher details updated successfully!");
      setTimeout(() => {
        if (onUpdated) {
          onUpdated();
        } else {
          navigate("/system-admin/teachers");
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update teacher details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const teacherId = teacher?.id || id;
    if (!teacherId) return;

    setDeleteLoading(true);
    setError("");
    const token = getToken();

    try {
      const res = await fetch(`/api/accounts/users/${teacherId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete teacher account.");

      setShowDeleteModal(false);
      if (onDeleted) {
        onDeleted();
      } else {
        navigate("/system-admin/teachers");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete teacher.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", path: "/system-admin/dashboard" },
    { label: "Teachers", path: "/system-admin/teachers" },
    { label: "Edit Teacher" },
  ];

  if (fetchLoading) {
    return (
      <div className="admin-teacher-page-container">
        <div className="admin-card" style={{ textAlign: "center", padding: "48px" }}>
          Loading teacher details...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-teacher-page-container">
      <TeacherPageHeader
        breadcrumbs={breadcrumbs}
        icon={<UserCheck size={28} />}
        title="Edit Teacher Account"
        subtitle="Update teacher details and account status."
        rightActions={
          <>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={handleBack}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              type="button"
              className="admin-btn-danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={loading}
            >
              <Trash2 size={18} />
              Delete Teacher
            </button>
          </>
        }
      />

      <TeacherForm
        mode="edit"
        formData={formData}
        setFormData={setFormData}
        availableClassrooms={availableClassrooms}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        loading={loading}
        error={error}
        success={success}
      />

      <DeleteTeacherModal
        teacher={showDeleteModal ? teacher : null}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
};

export default EditTeacherPage;
