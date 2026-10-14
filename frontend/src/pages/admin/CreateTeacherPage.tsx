import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowLeft } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import TeacherPageHeader from "../../components/teachers/TeacherPageHeader";
import TeacherForm, { TeacherFormData, ClassroomItem } from "../../components/teachers/TeacherForm";

import "../../styles/admin-teachers.css";

interface CreateTeacherPageProps {
  onBack?: () => void;
  onCreated?: () => void;
}

const CreateTeacherPage: React.FC<CreateTeacherPageProps> = ({ onBack, onCreated }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<TeacherFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    isActive: true,
    classrooms: [],
  });

  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchClassrooms();
  }, []);

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/system-admin/teachers");
    }
  };

  const [backendFieldErrors, setBackendFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    setBackendFieldErrors({});

    setLoading(true);
    const token = getToken();

    const payload: any = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      is_active: formData.isActive,
      role: "TEACHER",
      classrooms: formData.classrooms,
    };

    try {
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const mappedErrors: Record<string, string> = {};
        if (errData.email) {
          mappedErrors.email = Array.isArray(errData.email) ? errData.email.join(" ") : errData.email;
        }
        if (errData.first_name) {
          mappedErrors.firstName = Array.isArray(errData.first_name) ? errData.first_name.join(" ") : errData.first_name;
        }
        if (errData.last_name) {
          mappedErrors.lastName = Array.isArray(errData.last_name) ? errData.last_name.join(" ") : errData.last_name;
        }
        if (errData.password) {
          mappedErrors.password = Array.isArray(errData.password) ? errData.password.join(" ") : errData.password;
        }
        setBackendFieldErrors(mappedErrors);

        let message = "Failed to create teacher account.";
        if (errData.detail) {
          message = errData.detail;
        } else if (Object.keys(mappedErrors).length > 0) {
          message = "Please correct the highlighted fields.";
        }
        throw new Error(message);
      }

      setSuccess("Teacher account created successfully!");
      setTimeout(() => {
        if (onCreated) {
          onCreated();
        } else {
          navigate("/system-admin/teachers");
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create teacher account.");
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", path: "/system-admin/dashboard" },
    { label: "Teachers", path: "/system-admin/teachers" },
    { label: "Create Teacher" },
  ];

  return (
    <div className="admin-teacher-page-container">
      <TeacherPageHeader
        breadcrumbs={breadcrumbs}
        icon={<UserPlus size={28} />}
        title="Create Teacher Account"
        subtitle="Add a new teacher account and assign access."
        rightActions={
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            Back to Teachers
          </button>
        }
      />

      <TeacherForm
        mode="create"
        formData={formData}
        setFormData={setFormData}
        availableClassrooms={availableClassrooms}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        loading={loading}
        error={error}
        success={success}
        backendFieldErrors={backendFieldErrors}
      />
    </div>
  );
};

export default CreateTeacherPage;
