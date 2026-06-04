import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type School = {
  id: number;
  name: string;
  location: string;
  address: string;
  province: string;
  district: string;
  zone: string;
  educational_zone: string;
};

type SchoolAdmin = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role?: string | null;
  school_id?: number | null;
  is_active: boolean;
  student_profile?: {
    index_no?: string;
    grade?: string;
    class_name?: string;
  } | null;
  teacher_profile?: {
    subjects?: string[];
  } | null;
};

type CurrentUser = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

const NationalAdminDashboard = () => {
  const currentUser = getUser() as CurrentUser | null;
  const [schools, setSchools] = useState<School[]>([]);
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"schools" | "admins">(
    "schools"
  );
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showDeleteSchoolConfirm, setShowDeleteSchoolConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SchoolAdmin | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolErrors, setSchoolErrors] = useState<Record<string, string>>({});
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});
  const [editSchoolErrors, setEditSchoolErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const currentDisplayName = useMemo(() => {
    if (!currentUser) return "National Admin";
    const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    return fullName || "National Admin";
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
    return "NA";
  }, [currentUser]);

  const formatRole = (role?: string | null) => {
    if (!role) return "Unknown";
    return role
      .toLowerCase()
      .split("_")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  };

  const getInitials = (user: any) => {
    const source = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    if (source) {
      return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return (user.username || user.email || "U").slice(0, 2).toUpperCase();
  };

  const userRoleOptions = ["SCHOOL_ADMIN", "TEACHER", "STUDENT"];

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    zone: "",
    educationalZone: "",
  });
  const [editSchoolForm, setEditSchoolForm] = useState({
    name: "",
    address: "",
    province: "",
    district: "",
    zone: "",
    educationalZone: "",
  });
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    schoolId: "",
    role: "SCHOOL_ADMIN",
    indexNo: "",
    grade: "",
    className: "",
    subjects: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editAdminForm, setEditAdminForm] = useState({
    firstName: "",
    lastName: "",
    schoolId: "",
    role: "SCHOOL_ADMIN",
    indexNo: "",
    grade: "",
    className: "",
    subjects: "",
  });
  const [editAdminErrors, setEditAdminErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const [schoolsRes, adminsRes] = await Promise.all([
        fetch("/api/schools/", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/accounts/users/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);

      if (!schoolsRes.ok) throw new Error("Unable to load schools");
      if (!adminsRes.ok) throw new Error("Unable to load school admins");

      const schoolData = (await schoolsRes.json()) as School[];
      const adminData = (await adminsRes.json()) as SchoolAdmin[];
      setSchools(schoolData);
      setAdmins(adminData);
    } catch (err: any) {
      setError(err.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);



  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSchoolErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMessage("");
    setSchoolForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAdminErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMessage("");
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditAdminChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditAdminErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMessage("");
    setEditAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateSchoolForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!schoolForm.name.trim()) nextErrors.name = "School name is required.";
    if (!schoolForm.address.trim()) nextErrors.address = "Address is required.";
    if (!schoolForm.province.trim()) nextErrors.province = "Province is required.";
    if (!schoolForm.district.trim()) nextErrors.district = "District is required.";
    if (!schoolForm.zone.trim()) nextErrors.zone = "Zone is required.";
    if (!schoolForm.educationalZone.trim()) nextErrors.educationalZone = "Educational zone is required.";
    setSchoolErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAdminForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!adminForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!adminForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (adminForm.role === "STUDENT" && !adminForm.username.trim()) {
      nextErrors.username = "Username is required.";
    }
    if (!adminForm.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!adminForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (adminForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (!adminForm.schoolId) {
      nextErrors.schoolId = "Select a school to assign.";
    }
    if (adminForm.role === "STUDENT") {
      if (!adminForm.indexNo.trim()) nextErrors.indexNo = "Index number is required.";
      if (!adminForm.grade.trim()) nextErrors.grade = "Grade is required.";
      if (!adminForm.className.trim()) nextErrors.className = "Class name is required.";
    }
    if (adminForm.role === "TEACHER") {
      if (!adminForm.subjects.trim()) nextErrors.subjects = "Subjects are required.";
    }
    setAdminErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditAdminForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editAdminForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!editAdminForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!editAdminForm.schoolId) {
      nextErrors.schoolId = "Select a school to assign.";
    }
    if (editAdminForm.role === "STUDENT") {
      if (!editAdminForm.indexNo.trim()) nextErrors.indexNo = "Index number is required.";
      if (!editAdminForm.grade.trim()) nextErrors.grade = "Grade is required.";
      if (!editAdminForm.className.trim()) nextErrors.className = "Class name is required.";
    }
    if (editAdminForm.role === "TEACHER") {
      if (!editAdminForm.subjects.trim()) nextErrors.subjects = "Subjects are required.";
    }
    setEditAdminErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenEditModal = (user: SchoolAdmin) => {
    setSelectedAdmin(user);
    setEditAdminForm({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      schoolId: user.school_id?.toString() || "",
      role: user.role || "SCHOOL_ADMIN",
      indexNo: user.student_profile?.index_no || "",
      grade: user.student_profile?.grade || "",
      className: user.student_profile?.class_name || "",
      subjects: user.teacher_profile?.subjects?.join(", ") || "",
    });
    setEditAdminErrors({});
    setShowEditAdminModal(true);
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateEditAdminForm() || !selectedAdmin) return;

    setActionLoading(true);
    try {
      const token = getToken();
      const payload: any = {
        first_name: editAdminForm.firstName.trim(),
        last_name: editAdminForm.lastName.trim(),
        school_id: editAdminForm.schoolId ? Number(editAdminForm.schoolId) : null,
        role: editAdminForm.role,
      };
      if (editAdminForm.role === "STUDENT") {
        payload.index_no = editAdminForm.indexNo.trim();
        payload.grade = editAdminForm.grade.trim();
        payload.class_name = editAdminForm.className.trim();
      }
      if (editAdminForm.role === "TEACHER") {
        payload.subjects = editAdminForm.subjects.split(",").map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(`/api/accounts/users/${selectedAdmin.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload && typeof payload === "object") {
          const nextErrors: Record<string, string> = {};
          Object.entries(payload).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              nextErrors[key] = value.join(" ");
            } else if (typeof value === "string") {
              nextErrors[key] = value;
            }
          });
          setEditAdminErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to update school admin");
      }

      const updatedAdminData = (await res.json().catch(() => null)) as SchoolAdmin | null;
      if (updatedAdminData) {
        setAdmins((prev) =>
          prev.map((item) => (item.id === updatedAdminData.id ? updatedAdminData : item))
        );
      }
      setShowEditAdminModal(false);
      setSelectedAdmin(null);
      await fetchData();
      setSuccessMessage("School admin updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update school admin");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdminStatus = async (admin: SchoolAdmin) => {
    setError("");
    setSuccessMessage("");
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${admin.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          is_active: !admin.is_active,
        }),
      });

      if (!res.ok) throw new Error("Unable to update admin status");
      const updatedAdminData = (await res.json().catch(() => null)) as SchoolAdmin | null;
      if (updatedAdminData) {
        setAdmins((prev) =>
          prev.map((item) => (item.id === updatedAdminData.id ? updatedAdminData : item))
        );
      }
      await fetchData();
      setSuccessMessage(
        `School admin ${!admin.is_active ? "activated" : "deactivated"} successfully.`
      );
    } catch (err: any) {
      setError(err.message || "Unable to update admin status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    setError("");
    setSuccessMessage("");
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${selectedAdmin.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) throw new Error("Unable to delete school admin");
      setShowDeleteConfirm(false);
      setSelectedAdmin(null);
      await fetchData();
      setSuccessMessage("School admin deleted successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to delete school admin");
    } finally {
      setActionLoading(false);
    }
  };

  const validateEditSchoolForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editSchoolForm.name.trim()) nextErrors.name = "School name is required.";
    if (!editSchoolForm.address.trim()) nextErrors.address = "Address is required.";
    if (!editSchoolForm.province.trim()) nextErrors.province = "Province is required.";
    if (!editSchoolForm.district.trim()) nextErrors.district = "District is required.";
    if (!editSchoolForm.zone.trim()) nextErrors.zone = "Zone is required.";
    if (!editSchoolForm.educationalZone.trim()) nextErrors.educationalZone = "Educational zone is required.";
    setEditSchoolErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenEditSchoolModal = (school: School) => {
    setSelectedSchool(school);
    setEditSchoolForm({
      name: school.name || "",
      address: school.address || "",
      province: school.province || "",
      district: school.district || "",
      zone: school.zone || "",
      educationalZone: school.educational_zone || "",
    });
    setEditSchoolErrors({});
    setShowEditSchoolModal(true);
  };

  const handleEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateEditSchoolForm() || !selectedSchool) return;

    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/schools/${selectedSchool.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name: editSchoolForm.name.trim(),
          location: editSchoolForm.address.trim(),
          address: editSchoolForm.address.trim(),
          province: editSchoolForm.province.trim(),
          district: editSchoolForm.district.trim(),
          zone: editSchoolForm.zone.trim(),
          educational_zone: editSchoolForm.educationalZone.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload && typeof payload === "object") {
          const nextErrors: Record<string, string> = {};
          Object.entries(payload).forEach(([key, value]) => {
            if (key === "educational_zone") {
              nextErrors["educationalZone"] = Array.isArray(value) ? value.join(" ") : String(value);
            } else if (Array.isArray(value)) {
              nextErrors[key] = value.join(" ");
            } else if (typeof value === "string") {
              nextErrors[key] = value;
            }
          });
          setEditSchoolErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to update school");
      }

      setShowEditSchoolModal(false);
      setSelectedSchool(null);
      await fetchData();
      setSuccessMessage("School updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update school");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchool) return;
    setError("");
    setSuccessMessage("");
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/schools/${selectedSchool.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) throw new Error("Unable to delete school");
      setShowDeleteSchoolConfirm(false);
      setSelectedSchool(null);
      await fetchData();
      setSuccessMessage("School deleted successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to delete school");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateSchoolForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/schools/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name: schoolForm.name.trim(),
          location: schoolForm.address.trim(),
          address: schoolForm.address.trim(),
          province: schoolForm.province.trim(),
          district: schoolForm.district.trim(),
          zone: schoolForm.zone.trim(),
          educational_zone: schoolForm.educationalZone.trim(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload && typeof payload === "object") {
          const nextErrors: Record<string, string> = {};
          Object.entries(payload).forEach(([key, value]) => {
            if (key === "educational_zone") {
              nextErrors["educationalZone"] = Array.isArray(value) ? value.join(" ") : String(value);
            } else if (Array.isArray(value)) {
              nextErrors[key] = value.join(" ");
            } else if (typeof value === "string") {
              nextErrors[key] = value;
            }
          });
          setSchoolErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to create school");
      }
      setSchoolForm({
        name: "",
        address: "",
        province: "",
        district: "",
        zone: "",
        educationalZone: "",
      });
      await fetchData();
      setShowSchoolModal(false);
      setSuccessMessage("School created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create school");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateAdminForm()) return;
    setActionLoading(true);
    try {
      const token = getToken();
      const payload: any = {
        first_name: adminForm.firstName.trim(),
        last_name: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        username: adminForm.role === "STUDENT" ? adminForm.username.trim() : adminForm.email.trim(),
        password: adminForm.password,
        role: adminForm.role,
        school_id: adminForm.schoolId ? Number(adminForm.schoolId) : null,
      };
      if (adminForm.role === "STUDENT") {
        payload.index_no = adminForm.indexNo.trim();
        payload.grade = adminForm.grade.trim();
        payload.class_name = adminForm.className.trim();
      }
      if (adminForm.role === "TEACHER") {
        payload.subjects = adminForm.subjects.split(",").map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const payloadErr = await res.json().catch(() => ({}));
        if (payloadErr && typeof payloadErr === "object") {
          const nextErrors: Record<string, string> = {};
          Object.entries(payloadErr).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              nextErrors[key] = value.join(" ");
            } else if (typeof value === "string") {
              nextErrors[key] = value;
            }
          });
          setAdminErrors(nextErrors);
        }
        throw new Error(payloadErr?.detail || "Unable to create user");
      }
      setAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        schoolId: "",
        role: "SCHOOL_ADMIN",
        indexNo: "",
        grade: "",
        className: "",
        subjects: "",
      });
      await fetchData();
      setShowAdminModal(false);
      setSuccessMessage("User created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div>
              <div className="admin-brand-title">EduInsight</div>
              <div className="admin-brand-sub">NATIONAL ADMIN</div>
            </div>
          </div>
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeSection === "schools" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("schools")}
            >
              Schools
            </button>
            <button
              className={`admin-nav-item ${activeSection === "admins" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection("admins")}
            >
              Users
            </button>
            <button className="admin-nav-item" type="button">
              National Reports
            </button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{currentInitials}</div>
            <div>
              <div className="admin-user-name">{currentDisplayName}</div>
              <div className="admin-user-email">{currentUser?.email || "admin@moe.gov.lk"}</div>
            </div>
          </div>
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
        <div className="admin-topbar">
          <div>
            <div className="admin-title">
              {activeSection === "schools" ? "School Registry" : "User Management"}
            </div>
            <div className="admin-subtitle">
              {activeSection === "schools"
                ? "Review registered schools and add new institutions."
                : "Manage credentials and access levels across school roles."}
            </div>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-profile">
              <div className="admin-profile-avatar" />
              <div>
                <div className="admin-user-name">{currentDisplayName}</div>
                <div className="admin-profile-meta">National Administrator</div>
              </div>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="admin-success" role="status">
            {successMessage}
          </div>
        )}

        {activeSection === "schools" && (
          <>
            <div className="admin-user-toolbar" style={{ justifyContent: "flex-end", marginBottom: "20px" }}>
              <button
                className="admin-login-btn"
                type="button"
                onClick={() => {
                  setShowSchoolModal(true);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={actionLoading}
                style={{ width: "auto", padding: "10px 24px" }}
              >
                Create School
              </button>
            </div>
            <section className="admin-content-grid admin-content-grid--single">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">School Directory</div>
                    <div className="admin-card-subtitle">
                      Manage registered schools and their locations.
                    </div>
                  </div>
                </div>
                <div className="admin-table">
                  <div className="admin-table-header" style={{ gridTemplateColumns: "1.2fr 1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                    <span>School Name</span>
                    <span>Address</span>
                    <span>Province</span>
                    <span>District</span>
                    <span>Educational Zone</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading schools...</div>}
                  {!loading && schools.length === 0 && (
                    <div className="admin-empty">No schools registered yet.</div>
                  )}
                  {schools.map((school) => (
                    <div className="admin-table-row" key={school.id} style={{ gridTemplateColumns: "1.2fr 1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                      <div>
                        <strong className="user-name">{school.name}</strong>
                        <div className="user-meta">ID {school.id}</div>
                      </div>
                      <div className="user-meta">{school.address || school.location || "—"}</div>
                      <div className="user-meta">{school.province || "—"}</div>
                      <div className="user-meta">{school.district || "—"}</div>
                      <div className="user-meta">{school.educational_zone || "—"}</div>
                      <div className="admin-action-group">
                        <button
                          className="admin-action-btn"
                          type="button"
                          onClick={() => handleOpenEditSchoolModal(school)}
                          disabled={actionLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn danger"
                          type="button"
                          onClick={() => {
                            setSelectedSchool(school);
                            setShowDeleteSchoolConfirm(true);
                          }}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeSection === "admins" && (
          <>
            <div className="admin-user-toolbar" style={{ justifyContent: "flex-end", marginBottom: "20px" }}>
              <button
                className="admin-login-btn"
                type="button"
                onClick={() => {
                  setShowAdminModal(true);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={actionLoading}
                style={{ width: "auto", padding: "10px 24px" }}
              >
                Create User
              </button>
            </div>
            <section className="admin-content-grid admin-content-grid--single">
              <div className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <div className="admin-card-title">User Directory</div>
                    <div className="admin-card-subtitle">
                      View and monitor school admin, teacher, and student accounts.
                    </div>
                  </div>
                </div>
                <div className="admin-table">
                  <div className="admin-table-header" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                    <span>User</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Email</span>
                    <span>Actions</span>
                  </div>
                  {loading && <div className="admin-empty">Loading users...</div>}
                  {!loading && admins.length === 0 && (
                    <div className="admin-empty">No users found.</div>
                  )}
                  {admins.map((admin) => (
                    <div className="admin-table-row" key={admin.id} style={{ gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr 1fr" }}>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">{getInitials(admin)}</div>
                        <div>
                          <div className="user-name">
                            {`${admin.first_name || ""} ${admin.last_name || ""}`.trim() || admin.username}
                          </div>
                          <div className="user-meta">@{admin.username}</div>
                        </div>
                      </div>
                      <div className="user-meta">{formatRole(admin.role)}</div>
                      <div>
                        <span className={`status-pill ${admin.is_active ? "status-active" : "status-suspended"}`}>
                          {admin.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <div className="user-meta">{admin.email}</div>
                      <div className="admin-action-group">
                        <button
                          className="admin-action-btn"
                          type="button"
                          onClick={() => handleOpenEditModal(admin)}
                          disabled={actionLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn warning"
                          type="button"
                          onClick={() => handleToggleAdminStatus(admin)}
                          disabled={actionLoading}
                        >
                          {admin.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="admin-action-btn danger"
                          type="button"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      {showSchoolModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Create School</div>
                <div className="admin-card-subtitle">
                  Add a new school to the national registry.
                </div>
              </div>

            </div>
            <form className="admin-form" onSubmit={handleCreateSchool}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>School Name *</label>
                  <input
                    name="name"
                    value={schoolForm.name}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.name && (
                    <div className="admin-error">{schoolErrors.name}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Address *</label>
                  <input
                    name="address"
                    value={schoolForm.address}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.address && (
                    <div className="admin-error">{schoolErrors.address}</div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Province *</label>
                  <input
                    name="province"
                    value={schoolForm.province}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.province && (
                    <div className="admin-error">{schoolErrors.province}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>District *</label>
                  <input
                    name="district"
                    value={schoolForm.district}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.district && (
                    <div className="admin-error">{schoolErrors.district}</div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Zone *</label>
                  <input
                    name="zone"
                    value={schoolForm.zone}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.zone && (
                    <div className="admin-error">{schoolErrors.zone}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Educational Zone *</label>
                  <input
                    name="educationalZone"
                    value={schoolForm.educationalZone}
                    onChange={handleSchoolChange}
                  />
                  {schoolErrors.educationalZone && (
                    <div className="admin-error">{schoolErrors.educationalZone}</div>
                  )}
                </div>
              </div>

              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowSchoolModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Register School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAdminModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Create User</div>
                <div className="admin-card-subtitle">
                  Assign a user to a registered school.
                </div>
              </div>

            </div>
            <form className="admin-form" onSubmit={handleCreateSchoolAdmin}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={adminForm.firstName}
                    onChange={handleAdminChange}
                  />
                  {adminErrors.firstName && (
                    <div className="admin-error">{adminErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={adminForm.lastName}
                    onChange={handleAdminChange}
                  />
                  {adminErrors.lastName && (
                    <div className="admin-error">{adminErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Email *</label>
                <input
                  name="email"
                  type="email"
                  value={adminForm.email}
                  onChange={handleAdminChange}
                />
                {adminErrors.email && (
                  <div className="admin-error">{adminErrors.email}</div>
                )}
              </div>
              {adminForm.role === "STUDENT" && (
                <div className="admin-field">
                  <label>Username *</label>
                  <input
                    name="username"
                    value={adminForm.username}
                    onChange={handleAdminChange}
                  />
                  {adminErrors.username && (
                    <div className="admin-error">{adminErrors.username}</div>
                  )}
                </div>
              )}
              <div className="admin-field">
                <label>Password *</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={handleAdminChange}
                    style={{ paddingRight: "40px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {adminErrors.password && (
                  <div className="admin-error">{adminErrors.password}</div>
                )}
              </div>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Role *</label>
                  <select
                    name="role"
                    className="admin-filter-select"
                    style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                    value={adminForm.role}
                    onChange={handleAdminChange}
                  >
                    {userRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Assign School *</label>
                  <select
                    name="schoolId"
                    value={adminForm.schoolId}
                    onChange={handleAdminChange}
                  >
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  {adminErrors.schoolId && (
                    <div className="admin-error">{adminErrors.schoolId}</div>
                  )}
                </div>
              </div>

              {adminForm.role === "STUDENT" && (
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Index No *</label>
                    <input
                      name="indexNo"
                      value={adminForm.indexNo}
                      onChange={handleAdminChange}
                    />
                    {adminErrors.indexNo && (
                      <div className="admin-error">{adminErrors.indexNo}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Grade *</label>
                    <input
                      name="grade"
                      value={adminForm.grade}
                      onChange={handleAdminChange}
                    />
                    {adminErrors.grade && (
                      <div className="admin-error">{adminErrors.grade}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Class *</label>
                    <input
                      name="className"
                      value={adminForm.className}
                      onChange={handleAdminChange}
                    />
                    {adminErrors.className && (
                      <div className="admin-error">{adminErrors.className}</div>
                    )}
                  </div>
                </div>
              )}

              {adminForm.role === "TEACHER" && (
                <div className="admin-field">
                  <label>Subjects (comma separated) *</label>
                  <input
                    name="subjects"
                    placeholder="e.g. Mathematics, Science"
                    value={adminForm.subjects}
                    onChange={handleAdminChange}
                  />
                  {adminErrors.subjects && (
                    <div className="admin-error">{adminErrors.subjects}</div>
                  )}
                </div>
              )}

              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={actionLoading}>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditAdminModal && selectedAdmin && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Edit User</div>
                <div className="admin-card-subtitle">
                  Update user information.
                </div>
              </div>

            </div>
            <form className="admin-form" onSubmit={handleEditAdmin}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name *</label>
                  <input
                    name="firstName"
                    value={editAdminForm.firstName}
                    onChange={handleEditAdminChange}
                  />
                  {editAdminErrors.firstName && (
                    <div className="admin-error">{editAdminErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name *</label>
                  <input
                    name="lastName"
                    value={editAdminForm.lastName}
                    onChange={handleEditAdminChange}
                  />
                  {editAdminErrors.lastName && (
                    <div className="admin-error">{editAdminErrors.lastName}</div>
                  )}
                </div>
              </div>
              <div className="admin-field">
                <label>Email</label>
                <input type="email" value={selectedAdmin.email} disabled />
                <div className="admin-hint">Email cannot be changed.</div>
              </div>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Role *</label>
                  <select
                    name="role"
                    className="admin-filter-select"
                    style={{ width: "100%", height: "42px", padding: "8px 12px" }}
                    value={editAdminForm.role}
                    onChange={handleEditAdminChange}
                  >
                    {userRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Assign School *</label>
                  <select
                    name="schoolId"
                    value={editAdminForm.schoolId}
                    onChange={handleEditAdminChange}
                  >
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  {editAdminErrors.schoolId && (
                    <div className="admin-error">{editAdminErrors.schoolId}</div>
                  )}
                </div>
              </div>

              {editAdminForm.role === "STUDENT" && (
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Index No *</label>
                    <input
                      name="indexNo"
                      value={editAdminForm.indexNo}
                      onChange={handleEditAdminChange}
                    />
                    {editAdminErrors.indexNo && (
                      <div className="admin-error">{editAdminErrors.indexNo}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Grade *</label>
                    <input
                      name="grade"
                      value={editAdminForm.grade}
                      onChange={handleEditAdminChange}
                    />
                    {editAdminErrors.grade && (
                      <div className="admin-error">{editAdminErrors.grade}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Class *</label>
                    <input
                      name="className"
                      value={editAdminForm.className}
                      onChange={handleEditAdminChange}
                    />
                    {editAdminErrors.className && (
                      <div className="admin-error">{editAdminErrors.className}</div>
                    )}
                  </div>
                </div>
              )}

              {editAdminForm.role === "TEACHER" && (
                <div className="admin-field">
                  <label>Subjects (comma separated) *</label>
                  <input
                    name="subjects"
                    placeholder="e.g. Mathematics, Science"
                    value={editAdminForm.subjects}
                    onChange={handleEditAdminChange}
                  />
                  {editAdminErrors.subjects && (
                    <div className="admin-error">{editAdminErrors.subjects}</div>
                  )}
                </div>
              )}

              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowEditAdminModal(false)}
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
      {showDeleteConfirm && selectedAdmin && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal admin-modal--small">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Confirm Delete</div>
                <div className="admin-card-subtitle">
                  Are you sure you want to permanently delete this user account?
                </div>
              </div>
            </div>
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", borderRadius: "0.375rem", margin: "1rem 0" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                {selectedAdmin.first_name} {selectedAdmin.last_name} ({selectedAdmin.email})
              </div>
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                This action cannot be undone.
              </div>
            </div>
            <div className="admin-modal-actions">
              <button
                className="admin-secondary-btn"
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="admin-danger-btn"
                type="button"
                onClick={handleDeleteAdmin}
                disabled={actionLoading}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditSchoolModal && selectedSchool && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Edit School</div>
                <div className="admin-card-subtitle">
                  Update school information.
                </div>
              </div>

            </div>
            <form className="admin-form" onSubmit={handleEditSchool}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>School Name *</label>
                  <input
                    name="name"
                    value={editSchoolForm.name}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, name: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, name: "" }));
                    }}
                  />
                  {editSchoolErrors.name && (
                    <div className="admin-error">{editSchoolErrors.name}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Address *</label>
                  <input
                    name="address"
                    value={editSchoolForm.address}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, address: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, address: "" }));
                    }}
                  />
                  {editSchoolErrors.address && (
                    <div className="admin-error">{editSchoolErrors.address}</div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Province *</label>
                  <input
                    name="province"
                    value={editSchoolForm.province}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, province: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, province: "" }));
                    }}
                  />
                  {editSchoolErrors.province && (
                    <div className="admin-error">{editSchoolErrors.province}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>District *</label>
                  <input
                    name="district"
                    value={editSchoolForm.district}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, district: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, district: "" }));
                    }}
                  />
                  {editSchoolErrors.district && (
                    <div className="admin-error">{editSchoolErrors.district}</div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Zone *</label>
                  <input
                    name="zone"
                    value={editSchoolForm.zone}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, zone: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, zone: "" }));
                    }}
                  />
                  {editSchoolErrors.zone && (
                    <div className="admin-error">{editSchoolErrors.zone}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Educational Zone *</label>
                  <input
                    name="educationalZone"
                    value={editSchoolForm.educationalZone}
                    onChange={(e) => {
                      setEditSchoolForm((prev) => ({ ...prev, educationalZone: e.target.value }));
                      setEditSchoolErrors((prev) => ({ ...prev, educationalZone: "" }));
                    }}
                  />
                  {editSchoolErrors.educationalZone && (
                    <div className="admin-error">{editSchoolErrors.educationalZone}</div>
                  )}
                </div>
              </div>

              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-secondary-btn"
                  type="button"
                  onClick={() => setShowEditSchoolModal(false)}
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
      {showDeleteSchoolConfirm && selectedSchool && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal admin-modal--small">
            <div className="admin-modal-header">
              <div>
                <div className="admin-card-title">Confirm Delete</div>
                <div className="admin-card-subtitle">
                  Are you sure you want to permanently delete this school?
                </div>
              </div>
            </div>
            <div style={{ padding: "1rem", backgroundColor: "#fef2f2", borderRadius: "0.375rem", margin: "1rem 0" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                {selectedSchool.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                This action cannot be undone.
              </div>
            </div>
            <div className="admin-modal-actions">
              <button
                className="admin-secondary-btn"
                type="button"
                onClick={() => {
                  setShowDeleteSchoolConfirm(false);
                  setSelectedSchool(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="admin-danger-btn"
                type="button"
                onClick={handleDeleteSchool}
                disabled={actionLoading}
              >
                Delete School
              </button>
            </div>
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

export default NationalAdminDashboard;
