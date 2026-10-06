import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowLeft } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import StudentPageHeader from "../../components/students/StudentPageHeader";
import StudentForm, { StudentFormData, TeacherOption, ClassroomOption } from "../../components/students/StudentForm";

import "../../styles/admin-students.css";

const CreateStudentPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<StudentFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    indexNo: "",
    assignedTeacherId: "",
    classRoomId: "",
    isActive: true,
  });

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [teachersRes, classesRes] = await Promise.all([
        fetch("/api/accounts/users/?role=TEACHER", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/classes/classrooms/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.results || data);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClassrooms(data.results || data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load options.");
    }
  };

  const handleBack = () => {
    navigate("/system-admin/students");
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

    const username = formData.email.split("@")[0] + Math.floor(Math.random() * 1000);
    const selectedClassroom = classrooms.find(c => c.id.toString() === formData.classRoomId);

    const payload: any = {
      username,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      is_active: formData.isActive,
      role: "STUDENT",
      index_no: formData.indexNo.trim(),
      assigned_teacher_id: Number(formData.assignedTeacherId),
      class_room_id: Number(formData.classRoomId),
    };

    if (selectedClassroom?.school) {
      payload.school_id = selectedClassroom.school;
    }

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
        if (errData.assigned_teacher_id) {
          mappedErrors.assignedTeacherId = Array.isArray(errData.assigned_teacher_id) ? errData.assigned_teacher_id.join(" ") : errData.assigned_teacher_id;
        }
        if (errData.class_room_id) {
          mappedErrors.classRoomId = Array.isArray(errData.class_room_id) ? errData.class_room_id.join(" ") : errData.class_room_id;
        }
        setBackendFieldErrors(mappedErrors);

        let message = "Failed to create student account.";
        if (errData.detail) {
          message = errData.detail;
        } else if (Object.keys(mappedErrors).length > 0) {
          message = "Please correct the highlighted fields.";
        }
        throw new Error(message);
      }

      setSuccess("Student account created successfully!");
      setTimeout(() => {
        navigate("/system-admin/students");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create student account.");
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", path: "/system-admin/dashboard" },
    { label: "Students", path: "/system-admin/students" },
    { label: "Create Student" },
  ];

  return (
    <div className="admin-student-page-container">
      <StudentPageHeader
        breadcrumbs={breadcrumbs}
        icon={<UserPlus size={28} />}
        title="Create Student"
        subtitle="Add a new student and assign them to a class and teacher."
        rightActions={
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            Back to Students
          </button>
        }
      />

      <StudentForm
        mode="create"
        formData={formData}
        setFormData={setFormData}
        teachers={teachers}
        classrooms={classrooms}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        loading={loading}
        error={error}
        success={success}
        submitButtonText="Create Student"
        backendFieldErrors={backendFieldErrors}
      />
    </div>
  );
};

export default CreateStudentPage;
