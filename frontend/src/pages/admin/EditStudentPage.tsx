import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserCheck, Trash2, ArrowLeft } from "lucide-react";
import { getToken } from "../../auth/authUtils";

import StudentPageHeader from "../../components/students/StudentPageHeader";
import StudentForm, { StudentFormData, TeacherOption, ClassroomOption } from "../../components/students/StudentForm";
import DeleteStudentModal from "../../components/students/DeleteStudentModal";
import { StudentItem } from "../../components/students/StudentRow";

import "../../styles/admin-students.css";

const EditStudentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [student, setStudent] = useState<StudentItem | null>(null);
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
  
  const [pageLoading, setPageLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchStudentAndOptions();
  }, [id]);

  const fetchStudentAndOptions = async () => {
    if (!id) return;
    const token = getToken();
    if (!token) return;
    setPageLoading(true);

    try {
      const [userRes, teachersRes, classesRes] = await Promise.all([
        fetch(`/api/accounts/users/${id}/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/accounts/users/?role=TEACHER", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/classes/classrooms/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      if (!userRes.ok) throw new Error("Failed to load student record.");
      const studentData: StudentItem = await userRes.json();
      setStudent(studentData);

      if (teachersRes.ok) {
        const tData = await teachersRes.json();
        setTeachers(tData.results || tData);
      }

      if (classesRes.ok) {
        const cData = await classesRes.json();
        setClassrooms(cData.results || cData);
      }

      // Populate form data
      setFormData({
        firstName: studentData.first_name || "",
        lastName: studentData.last_name || "",
        email: studentData.email || "",
        password: "",
        indexNo: studentData.student_profile?.index_no || "",
        assignedTeacherId: studentData.student_profile?.assigned_teacher_id?.toString() || "",
        classRoomId: studentData.student_profile?.class_room?.id?.toString() || "",
        isActive: studentData.is_active ?? true,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load student data.");
    } finally {
      setPageLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/system-admin/students");
  };

  const [backendFieldErrors, setBackendFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveLoading || !id) return;
    setError("");
    setSuccess("");
    setBackendFieldErrors({});

    setSaveLoading(true);
    const token = getToken();

    const selectedClassroom = classrooms.find(c => c.id.toString() === formData.classRoomId);

    const payload: any = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      is_active: formData.isActive,
      role: "STUDENT",
      index_no: formData.indexNo.trim(),
      assigned_teacher_id: Number(formData.assignedTeacherId),
      class_room_id: Number(formData.classRoomId),
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    if (selectedClassroom?.school) {
      payload.school_id = selectedClassroom.school;
    }

    try {
      const res = await fetch(`/api/accounts/users/${id}/`, {
        method: "PATCH",
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

        let message = "Failed to update student account.";
        if (errData.detail) message = errData.detail;
        else if (Object.keys(mappedErrors).length > 0) {
          message = "Please correct the highlighted fields.";
        }
        throw new Error(message);
      }

      setSuccess("Student account updated successfully!");
      setTimeout(() => {
        navigate("/system-admin/students");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update student account.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id || !student) return;
    setDeleteLoading(true);
    const token = getToken();

    try {
      const res = await fetch(`/api/accounts/users/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete student account.");
      }

      setShowDeleteModal(false);
      navigate("/system-admin/students");
    } catch (err: any) {
      setError(err.message || "Failed to delete student account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", path: "/system-admin/dashboard" },
    { label: "Students", path: "/system-admin/students" },
    { label: "Edit Student" },
  ];

  if (pageLoading) {
    return (
      <div className="admin-student-page-container">
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--admin-text-secondary)" }}>
          Loading student details...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-student-page-container">
      <StudentPageHeader
        breadcrumbs={breadcrumbs}
        icon={<UserCheck size={28} />}
        title="Edit Student"
        subtitle="Update the student’s details and account status."
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
            >
              <Trash2 size={18} />
              Delete Student
            </button>
          </>
        }
      />

      <StudentForm
        mode="edit"
        formData={formData}
        setFormData={setFormData}
        teachers={teachers}
        classrooms={classrooms}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        loading={saveLoading}
        error={error}
        success={success}
        submitButtonText="Save Changes"
        backendFieldErrors={backendFieldErrors}
      />

      <DeleteStudentModal
        student={showDeleteModal ? student : null}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
};

export default EditStudentPage;
