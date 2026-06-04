import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import useCurrentUser from "../../hooks/useCurrentUser";
import "../../styles/admin.css";

type StudentProfile = {
  index_no?: string;
  grade?: string;
  class_name?: string;
};

type TeacherProfile = {
  subjects?: string[];
};

type StaffUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: "TEACHER" | "STUDENT";
  school_id?: number | null;
  is_active: boolean;
  student_profile?: StudentProfile | null;
  teacher_profile?: TeacherProfile | null;
};

const SchoolAdminDashboard = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"teachers" | "students">(
    "teachers"
  );
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [studentErrors, setStudentErrors] = useState<Record<string, string>>({});
  const [teacherErrors, setTeacherErrors] = useState<Record<string, string>>({});
  const [editStudentErrors, setEditStudentErrors] = useState<Record<string, string>>({});
  const [editTeacherErrors, setEditTeacherErrors] = useState<Record<string, string>>({});
  const [editingStudent, setEditingStudent] = useState<StaffUser | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<StaffUser | null>(null);

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    indexNo: "",
    grade: "",
    className: "",
  });
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    subjects: "",
  });
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: "",
    lastName: "",
    indexNo: "",
    grade: "",
    className: "",
    isActive: true,
  });
  const [editTeacherForm, setEditTeacherForm] = useState({
    firstName: "",
    lastName: "",
    subjects: "",
    isActive: true,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Inactive">(
    "ALL"
  );
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  const currentDisplayName = useMemo(() => {
    if (!currentUser) return "School Admin";
    const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    return fullName || "School Admin";
  }, [currentUser]);

  const currentInitials = useMemo(() => {
    const fullName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim();
    if (fullName) {
      return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return "SA";
  }, [currentUser]);

  const fetchStaff = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch("/api/accounts/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Unable to load users");
      const data = (await res.json()) as StaffUser[];
      setStaff(data);
    } catch (err: any) {
      setError(err.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const metrics = useMemo(() => {
    return {
      teachers: staff.filter((member) => member.role === "TEACHER").length,
      students: staff.filter((member) => member.role === "STUDENT").length,
      active: staff.filter((member) => member.is_active).length,
    };
  }, [staff]);

  const filteredTeachers = useMemo(() => {
    return staff
      .filter((member) => member.role === "TEACHER")
      .filter((member) => {
        const matchesSearch =
          member.first_name.toLowerCase().includes(search.toLowerCase()) ||
          member.last_name.toLowerCase().includes(search.toLowerCase()) ||
          member.email.toLowerCase().includes(search.toLowerCase()) ||
          (member.teacher_profile?.subjects || []).join(" ")
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "Active" ? member.is_active : !member.is_active);
        const matchesSubject =
          !subjectFilter.trim() ||
          (member.teacher_profile?.subjects || [])
            .join(" ")
            .toLowerCase()
            .includes(subjectFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesSubject;
      });
  }, [staff, search, statusFilter, subjectFilter]);

  const filteredStudents = useMemo(() => {
    return staff
      .filter((member) => member.role === "STUDENT")
      .filter((member) => {
        const matchesSearch =
          member.first_name.toLowerCase().includes(search.toLowerCase()) ||
          member.last_name.toLowerCase().includes(search.toLowerCase()) ||
          member.email.toLowerCase().includes(search.toLowerCase()) ||
          (member.student_profile?.index_no || "")
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "Active" ? member.is_active : !member.is_active);
        const matchesGrade =
          !gradeFilter.trim() ||
          (member.student_profile?.grade || "")
            .toLowerCase()
            .includes(gradeFilter.toLowerCase());
        const matchesClass =
          !classFilter.trim() ||
          (member.student_profile?.class_name || "")
            .toLowerCase()
            .includes(classFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesGrade && matchesClass;
      });
  }, [staff, search, statusFilter, gradeFilter, classFilter]);

  const parseSubjects = (raw: string) =>
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const validateStudentForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!studentForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!studentForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!studentForm.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!studentForm.username.trim())
      nextErrors.username = "Username is required.";
    if (!studentForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (studentForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (!studentForm.indexNo.trim())
      nextErrors.indexNo = "Index number is required.";
    if (!studentForm.grade.trim()) nextErrors.grade = "Grade is required.";
    if (!studentForm.className.trim())
      nextErrors.className = "Class is required.";
    setStudentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateTeacherForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!teacherForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!teacherForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!teacherForm.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!teacherForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (teacherForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (!parseSubjects(teacherForm.subjects).length)
      nextErrors.subjects = "Add at least one subject.";
    setTeacherErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditStudentForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editStudentForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!editStudentForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!editStudentForm.indexNo.trim())
      nextErrors.indexNo = "Index number is required.";
    if (!editStudentForm.grade.trim())
      nextErrors.grade = "Grade is required.";
    if (!editStudentForm.className.trim())
      nextErrors.className = "Class is required.";
    setEditStudentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditTeacherForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editTeacherForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!editTeacherForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!parseSubjects(editTeacherForm.subjects).length)
      nextErrors.subjects = "Add at least one subject.";
    setEditTeacherErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateStudentForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          username: studentForm.username.trim(),
          email: studentForm.email.trim(),
          password: studentForm.password,
          first_name: studentForm.firstName.trim(),
          last_name: studentForm.lastName.trim(),
          role: "STUDENT",
          index_no: studentForm.indexNo.trim(),
          grade: studentForm.grade.trim(),
          class_name: studentForm.className.trim(),
        }),
      });
      if (!res.ok) throw new Error("Unable to create student");
      setStudentForm({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        indexNo: "",
        grade: "",
        className: "",
      });
      setShowStudentModal(false);
      await fetchStaff();
      setSuccessMessage("Student created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create student");
    } finally {
      setActionLoading(false);
    }
  };

  const createTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateTeacherForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          username: teacherForm.email.trim(),
          email: teacherForm.email.trim(),
          password: teacherForm.password,
          first_name: teacherForm.firstName.trim(),
          last_name: teacherForm.lastName.trim(),
          role: "TEACHER",
          subjects: parseSubjects(teacherForm.subjects),
        }),
      });
      if (!res.ok) throw new Error("Unable to create teacher");
      setTeacherForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        subjects: "",
      });
      setShowTeacherModal(false);
      await fetchStaff();
      setSuccessMessage("Teacher created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create teacher");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditStudent = (student: StaffUser) => {
    setEditingStudent(student);
    setEditStudentErrors({});
    setEditStudentForm({
      firstName: student.first_name,
      lastName: student.last_name,
      indexNo: student.student_profile?.index_no || "",
      grade: student.student_profile?.grade || "",
      className: student.student_profile?.class_name || "",
      isActive: student.is_active,
    });
    setShowEditStudentModal(true);
  };

  const openEditTeacher = (teacher: StaffUser) => {
    setEditingTeacher(teacher);
    setEditTeacherErrors({});
    setEditTeacherForm({
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      subjects: (teacher.teacher_profile?.subjects || []).join(", "),
      isActive: teacher.is_active,
    });
    setShowEditTeacherModal(true);
  };

  const updateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setError("");
    if (!validateEditStudentForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${editingStudent.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editStudentForm.firstName.trim(),
          last_name: editStudentForm.lastName.trim(),
          index_no: editStudentForm.indexNo.trim(),
          grade: editStudentForm.grade.trim(),
          class_name: editStudentForm.className.trim(),
          is_active: editStudentForm.isActive,
        }),
      });
      if (!res.ok) throw new Error("Unable to update student");
      const updatedStudentData = (await res.json().catch(() => null)) as StaffUser | null;
      if (updatedStudentData) {
        setStaff((prev) =>
          prev.map((item) => (item.id === updatedStudentData.id ? updatedStudentData : item))
        );
      }
      setShowEditStudentModal(false);
      await fetchStaff();
      setSuccessMessage("Student updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update student");
    } finally {
      setActionLoading(false);
    }
  };

  const updateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setError("");
    if (!validateEditTeacherForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${editingTeacher.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editTeacherForm.firstName.trim(),
          last_name: editTeacherForm.lastName.trim(),
          subjects: parseSubjects(editTeacherForm.subjects),
          is_active: editTeacherForm.isActive,
        }),
      });
      if (!res.ok) throw new Error("Unable to update teacher");
      const updatedTeacherData = (await res.json().catch(() => null)) as StaffUser | null;
      if (updatedTeacherData) {
        setStaff((prev) =>
          prev.map((item) => (item.id === updatedTeacherData.id ? updatedTeacherData : item))
        );
      }
      setShowEditTeacherModal(false);
      await fetchStaff();
      setSuccessMessage("Teacher updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update teacher");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async (user: StaffUser) => {
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) throw new Error("Unable to update status");
      setStaff((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, is_active: !item.is_active } : item
        )
      );
    } catch (err: any) {
      setError(err.message || "Unable to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const removeUser = async (id: number) => {
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Unable to delete user");
      setStaff((prev) => prev.filter((member) => member.id !== id));
    } catch (err: any) {
      setError(err.message || "Unable to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div>
            <div className="admin-brand-title">EduInsight</div>
            <div className="admin-brand-sub">SCHOOL ADMIN</div>
          </div>
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${
              activeSection === "teachers" ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveSection("teachers")}
          >
            Teachers
          </button>
          <button
            className={`admin-nav-item ${
              activeSection === "students" ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveSection("students")}
          >
            Students
          </button>
          <button className="admin-nav-item" type="button">
            Class Setup
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{currentInitials}</div>
            <div>
              <div className="admin-user-name">{currentDisplayName}</div>
              <div className="admin-user-email">
                {currentUser?.email || ""}
              </div>
            </div>
          </div>
          <button
            className="admin-ghost-btn"
            type="button"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
          <button
            className="admin-ghost-btn"
            type="button"
            onClick={() => navigate("/logout")}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div className="admin-title">
              {activeSection === "teachers" ? "Teacher Directory" : "Student Directory"}
            </div>
            <div className="admin-subtitle">
              {activeSection === "teachers"
                ? "Manage teaching staff, subjects, and access levels."
                : "Track student enrollment, classes, and status."}
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-primary-btn"
              type="button"
              onClick={() =>
                activeSection === "teachers"
                  ? setShowTeacherModal(true)
                  : setShowStudentModal(true)
              }
              disabled={actionLoading}
            >
              {activeSection === "teachers" ? "Create Teacher" : "Create Student"}
            </button>
          </div>
        </header>

        <section className="admin-metrics">
          <div className="metric-card">
            <div className="metric-label">Teachers</div>
            <div className="metric-value">{metrics.teachers}</div>
            <div className="metric-meta">Assigned instructors</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Students</div>
            <div className="metric-value">{metrics.students}</div>
            <div className="metric-meta">Active learners</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Active Accounts</div>
            <div className="metric-value">{metrics.active}</div>
            <div className="metric-meta">Enabled profiles</div>
          </div>
        </section>

        {successMessage && (
          <div className="admin-success" role="status">
            {successMessage}
          </div>
        )}

        <section className="admin-content-grid admin-content-grid--single">
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-title">
                  {activeSection === "teachers" ? "Teachers" : "Students"}
                </div>
                <div className="admin-card-subtitle">
                  {activeSection === "teachers"
                    ? "Update teacher subjects, status, and profiles."
                    : "Update student details and enrollment status."}
                </div>
              </div>
              <div className="admin-filter-row">
                <div className="admin-search">
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="admin-select"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "ALL" | "Active" | "Inactive")
                  }
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {activeSection === "students" ? (
                  <>
                    <input
                      className="admin-select"
                      placeholder="Grade"
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                    />
                    <input
                      className="admin-select"
                      placeholder="Class"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    />
                  </>
                ) : (
                  <input
                    className="admin-select"
                    placeholder="Subject"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                  />
                )}
              </div>
            </div>

            {activeSection === "teachers" ? (
              <div className="admin-table admin-table--teachers">
                <div className="admin-table-header admin-table-header--teachers">
                  <span>Name</span>
                  <span>Subjects</span>
                  <span>Status</span>
                  <span>Email</span>
                  <span>Actions</span>
                </div>
                {loading && <div className="admin-empty">Loading teachers...</div>}
                {!loading && filteredTeachers.length === 0 && (
                  <div className="admin-empty">No teachers found.</div>
                )}
                {filteredTeachers.map((teacher) => (
                  <div
                    className="admin-table-row admin-table-row--teachers"
                    key={teacher.id}
                  >
                    <div>
                      <div className="user-name">
                        {teacher.first_name} {teacher.last_name}
                      </div>
                      <div className="user-meta">@{teacher.username}</div>
                    </div>
                    <div className="user-meta">
                      {(teacher.teacher_profile?.subjects || []).join(", ") ||
                        "Not set"}
                    </div>
                    <div>
                      <span
                        className={`status-pill status-${
                          teacher.is_active ? "active" : "inactive"
                        }`}
                      >
                        {teacher.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="user-meta">{teacher.email}</div>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        type="button"
                        onClick={() => openEditTeacher(teacher)}
                        disabled={actionLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-action-btn warning"
                        type="button"
                        onClick={() => toggleStatus(teacher)}
                        disabled={actionLoading}
                      >
                        {teacher.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="admin-action-btn danger"
                        type="button"
                        onClick={() => removeUser(teacher.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-table admin-table--students">
                <div className="admin-table-header admin-table-header--students">
                  <span>Index No</span>
                  <span>Name</span>
                  <span>Grade</span>
                  <span>Class</span>
                  <span>Status</span>
                  <span>Username</span>
                  <span>Actions</span>
                </div>
                {loading && <div className="admin-empty">Loading students...</div>}
                {!loading && filteredStudents.length === 0 && (
                  <div className="admin-empty">No students found.</div>
                )}
                {filteredStudents.map((student) => (
                  <div
                    className="admin-table-row admin-table-row--students"
                    key={student.id}
                  >
                    <div className="user-meta">
                      {student.student_profile?.index_no || "-"}
                    </div>
                    <div>
                      <div className="user-name">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="user-meta">{student.email}</div>
                    </div>
                    <div className="user-meta">
                      {student.student_profile?.grade || "-"}
                    </div>
                    <div className="user-meta">
                      {student.student_profile?.class_name || "-"}
                    </div>
                    <div>
                      <span
                        className={`status-pill status-${
                          student.is_active ? "active" : "inactive"
                        }`}
                      >
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="user-meta">@{student.username}</div>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        type="button"
                        onClick={() => openEditStudent(student)}
                        disabled={actionLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-action-btn warning"
                        type="button"
                        onClick={() => toggleStatus(student)}
                        disabled={actionLoading}
                      >
                        {student.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="admin-action-btn danger"
                        type="button"
                        onClick={() => removeUser(student.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showStudentModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Create Student</div>
                <div className="admin-card-subtitle">
                  Add a student and assign grade/class details.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowStudentModal(false)}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={createStudent}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={studentForm.firstName}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                  {studentErrors.firstName && (
                    <div className="admin-error">{studentErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={studentForm.lastName}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                  {studentErrors.lastName && (
                    <div className="admin-error">{studentErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Email *</label>
                <input
                  name="email"
                  type="email"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
                {studentErrors.email && (
                  <div className="admin-error">{studentErrors.email}</div>
                )}
              </div>
              <div className="admin-field">
                <label>Username *</label>
                <input
                  name="username"
                  value={studentForm.username}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
                {studentErrors.username && (
                  <div className="admin-error">{studentErrors.username}</div>
                )}
              </div>
              <div className="admin-field">
                <label>Password *</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    name="password"
                    type={showStudentPassword ? "text" : "password"}
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      zIndex: 10
                    }}
                    aria-label={showStudentPassword ? "Hide password" : "Show password"}
                  >
                    {showStudentPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {studentErrors.password && (
                  <div className="admin-error">{studentErrors.password}</div>
                )}
              </div>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Index No *</label>
                  <input
                    name="indexNo"
                    value={studentForm.indexNo}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        indexNo: e.target.value,
                      }))
                    }
                  />
                  {studentErrors.indexNo && (
                    <div className="admin-error">{studentErrors.indexNo}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Grade *</label>
                  <input
                    name="grade"
                    value={studentForm.grade}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        grade: e.target.value,
                      }))
                    }
                  />
                  {studentErrors.grade && (
                    <div className="admin-error">{studentErrors.grade}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Class *</label>
                <input
                  name="className"
                  value={studentForm.className}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      className: e.target.value,
                    }))
                  }
                />
                {studentErrors.className && (
                  <div className="admin-error">{studentErrors.className}</div>
                )}
              </div>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Create Teacher</div>
                <div className="admin-card-subtitle">
                  Add teaching staff and assign subjects.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowTeacherModal(false)}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={createTeacher}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={teacherForm.firstName}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                  {teacherErrors.firstName && (
                    <div className="admin-error">{teacherErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={teacherForm.lastName}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                  {teacherErrors.lastName && (
                    <div className="admin-error">{teacherErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Email (login) *</label>
                <input
                  name="email"
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
                {teacherErrors.email && (
                  <div className="admin-error">{teacherErrors.email}</div>
                )}
              </div>
              <div className="admin-field">
                <label>Password *</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    name="password"
                    type={showTeacherPassword ? "text" : "password"}
                    value={teacherForm.password}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      zIndex: 10
                    }}
                    aria-label={showTeacherPassword ? "Hide password" : "Show password"}
                  >
                    {showTeacherPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {teacherErrors.password && (
                  <div className="admin-error">{teacherErrors.password}</div>
                )}
              </div>
              <div className="admin-field">
                <label>Subjects (comma separated) *</label>
                <input
                  name="subjects"
                  value={teacherForm.subjects}
                  onChange={(e) =>
                    setTeacherForm((prev) => ({
                      ...prev,
                      subjects: e.target.value,
                    }))
                  }
                />
                {teacherErrors.subjects && (
                  <div className="admin-error">{teacherErrors.subjects}</div>
                )}
              </div>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Create Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditStudentModal && editingStudent && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Edit Student</div>
                <div className="admin-card-subtitle">
                  Update student details and status.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={updateStudent}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={editStudentForm.firstName}
                    onChange={(e) =>
                      setEditStudentForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                  {editStudentErrors.firstName && (
                    <div className="admin-error">{editStudentErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={editStudentForm.lastName}
                    onChange={(e) =>
                      setEditStudentForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                  {editStudentErrors.lastName && (
                    <div className="admin-error">{editStudentErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Index No *</label>
                  <input
                    name="indexNo"
                    value={editStudentForm.indexNo}
                    onChange={(e) =>
                      setEditStudentForm((prev) => ({
                        ...prev,
                        indexNo: e.target.value,
                      }))
                    }
                  />
                  {editStudentErrors.indexNo && (
                    <div className="admin-error">{editStudentErrors.indexNo}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Grade *</label>
                  <input
                    name="grade"
                    value={editStudentForm.grade}
                    onChange={(e) =>
                      setEditStudentForm((prev) => ({
                        ...prev,
                        grade: e.target.value,
                      }))
                    }
                  />
                  {editStudentErrors.grade && (
                    <div className="admin-error">{editStudentErrors.grade}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Class *</label>
                <input
                  name="className"
                  value={editStudentForm.className}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      className: e.target.value,
                    }))
                  }
                />
                {editStudentErrors.className && (
                  <div className="admin-error">{editStudentErrors.className}</div>
                )}
              </div>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={editStudentForm.isActive}
                  onChange={(e) =>
                    setEditStudentForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active student
              </label>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTeacherModal && editingTeacher && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Edit Teacher</div>
                <div className="admin-card-subtitle">
                  Update teacher details and subjects.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowEditTeacherModal(false)}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={updateTeacher}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={editTeacherForm.firstName}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                  {editTeacherErrors.firstName && (
                    <div className="admin-error">{editTeacherErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={editTeacherForm.lastName}
                    onChange={(e) =>
                      setEditTeacherForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                  {editTeacherErrors.lastName && (
                    <div className="admin-error">{editTeacherErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Subjects (comma separated) *</label>
                <input
                  name="subjects"
                  value={editTeacherForm.subjects}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      subjects: e.target.value,
                    }))
                  }
                />
                {editTeacherErrors.subjects && (
                  <div className="admin-error">{editTeacherErrors.subjects}</div>
                )}
              </div>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={editTeacherForm.isActive}
                  onChange={(e) =>
                    setEditTeacherForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active teacher
              </label>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen processing loader */}
      {actionLoading && (
        <div className="admin-loading-overlay">
          <div className="admin-spinner-container">
            <div className="admin-spinner"></div>
            <div className="admin-loading-text">processing</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAdminDashboard;
