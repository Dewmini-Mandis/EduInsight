import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type School = {
  id: number;
  name: string;
  location: string;
};

type SchoolAdmin = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: "SCHOOL_ADMIN";
  school_id?: number | null;
  is_active: boolean;
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

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    location: "",
  });
  const [editSchoolForm, setEditSchoolForm] = useState({
    name: "",
    location: "",
  });
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    schoolId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editAdminForm, setEditAdminForm] = useState({
    firstName: "",
    lastName: "",
    schoolId: "",
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

  const metrics = useMemo(() => {
    return {
      schools: schools.length,
      admins: admins.length,
      activeAdmins: admins.filter((admin) => admin.is_active).length,
    };
  }, [schools, admins]);

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
    if (!schoolForm.location.trim())
      nextErrors.location = "Location is required.";
    setSchoolErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAdminForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!adminForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!adminForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!adminForm.username.trim())
      nextErrors.username = "Username is required.";
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
    setAdminErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditAdminForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editAdminForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!editAdminForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!editAdminForm.schoolId) {
      nextErrors.schoolId = "Select a school to assign.";
    }
    setEditAdminErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenEditModal = (admin: SchoolAdmin) => {
    setSelectedAdmin(admin);
    setEditAdminForm({
      firstName: admin.first_name,
      lastName: admin.last_name,
      schoolId: admin.school_id?.toString() || "",
    });
    setEditAdminErrors({});
    setShowEditAdminModal(true);
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateEditAdminForm() || !selectedAdmin) return;

    try {
      const token = getToken();
      const res = await fetch(`/api/accounts/users/${selectedAdmin.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editAdminForm.firstName.trim(),
          last_name: editAdminForm.lastName.trim(),
          school_id: editAdminForm.schoolId ? Number(editAdminForm.schoolId) : null,
        }),
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
    }
  };

  const handleToggleAdminStatus = async (admin: SchoolAdmin) => {
    setError("");
    setSuccessMessage("");
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
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    setError("");
    setSuccessMessage("");
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
    }
  };

  const validateEditSchoolForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editSchoolForm.name.trim()) nextErrors.name = "School name is required.";
    if (!editSchoolForm.location.trim())
      nextErrors.location = "Location is required.";
    setEditSchoolErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenEditSchoolModal = (school: School) => {
    setSelectedSchool(school);
    setEditSchoolForm({ name: school.name, location: school.location });
    setEditSchoolErrors({});
    setShowEditSchoolModal(true);
  };

  const handleEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateEditSchoolForm() || !selectedSchool) return;

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
          location: editSchoolForm.location.trim(),
        }),
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
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchool) return;
    setError("");
    setSuccessMessage("");
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
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateSchoolForm()) return;
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
          location: schoolForm.location.trim(),
        }),
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
          setSchoolErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to create school");
      }
      setSchoolForm({ name: "", location: "" });
      await fetchData();
      setShowSchoolModal(false);
      setSuccessMessage("School created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create school");
    }
  };

  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateAdminForm()) return;
    try {
      const token = getToken();
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          username: adminForm.username.trim(),
          email: adminForm.email.trim(),
          password: adminForm.password,
          first_name: adminForm.firstName.trim(),
          last_name: adminForm.lastName.trim(),
          role: "SCHOOL_ADMIN",
          school_id: adminForm.schoolId ? Number(adminForm.schoolId) : null,
        }),
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
          setAdminErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to create school admin");
      }
      setAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        schoolId: "",
      });
      await fetchData();
      setShowAdminModal(false);
      setSuccessMessage("School admin created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create school admin");
    }
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
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
            School Admins
          </button>
          <button className="admin-nav-item" type="button">
            National Reports
          </button>
        </nav>
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
        <header className="admin-header">
          <div>
            <div className="admin-title">
              {activeSection === "schools" ? "School Registry" : "School Admins"}
            </div>
            <div className="admin-subtitle">
              {activeSection === "schools"
                ? "Review registered schools and add new institutions."
                : "Assign school administrators and monitor their access."}
            </div>
          </div>
          <div className="admin-header-actions">
            {activeSection === "schools" ? (
              <button
                className="admin-primary-btn"
                type="button"
                onClick={() => {
                  setShowSchoolModal(true);
                  setError("");
                  setSuccessMessage("");
                }}
              >
                Create School
              </button>
            ) : (
              <button
                className="admin-primary-btn"
                type="button"
                onClick={() => {
                  setShowAdminModal(true);
                  setError("");
                  setSuccessMessage("");
                }}
              >
                Create School Admin
              </button>
            )}
          </div>
        </header>

        {successMessage && (
          <div className="admin-success" role="status">
            {successMessage}
          </div>
        )}

        {activeSection === "schools" && (
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
              <div className="admin-table admin-table--schools">
                <div className="admin-table-header admin-table-header--schools">
                  <span>School</span>
                  <span>Location</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {loading && <div className="admin-empty">Loading schools...</div>}
                {!loading && schools.length === 0 && (
                  <div className="admin-empty">No schools registered yet.</div>
                )}
                {schools.map((school) => (
                  <div className="admin-table-row admin-table-row--schools" key={school.id}>
                    <div>
                      <div className="user-name">{school.name}</div>
                      <div className="user-meta">ID {school.id}</div>
                    </div>
                    <div className="user-meta">{school.location}</div>
                    <div>
                      <span className="status-pill status-active">Active</span>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn admin-action-btn--edit"
                        type="button"
                        onClick={() => handleOpenEditSchoolModal(school)}
                        title="Edit school"
                      >
                        Edit
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--delete"
                        type="button"
                        onClick={() => {
                          setSelectedSchool(school);
                          setShowDeleteSchoolConfirm(true);
                        }}
                        title="Delete school"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeSection === "admins" && (
          <section className="admin-content-grid admin-content-grid--single">
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-title">School Admin Directory</div>
                  <div className="admin-card-subtitle">
                    View and monitor school admin accounts.
                  </div>
                </div>
              </div>
              <div className="admin-table admin-table--admins">
                <div className="admin-table-header admin-table-header--admins">
                  <span>Name</span>
                  <span>School ID</span>
                  <span>Status</span>
                  <span>Email</span>
                  <span>Actions</span>
                </div>
                {loading && <div className="admin-empty">Loading admins...</div>}
                {!loading && admins.length === 0 && (
                  <div className="admin-empty">No school admins created.</div>
                )}
                {admins.map((admin) => (
                  <div className="admin-table-row admin-table-row--admins" key={admin.id}>
                    <div>
                      <div className="user-name">
                        {admin.first_name} {admin.last_name}
                      </div>
                      <div className="user-meta">@{admin.username}</div>
                    </div>
                    <div className="user-meta">
                      {admin.school_id ? `School ${admin.school_id}` : "Unassigned"}
                    </div>
                    <div>
                      <span
                        className={`status-pill status-${
                          admin.is_active ? "active" : "inactive"
                        }`}
                      >
                        {admin.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="user-meta">{admin.email}</div>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn admin-action-btn--edit"
                        type="button"
                        onClick={() => handleOpenEditModal(admin)}
                        title="Edit admin"
                      >
                        Edit
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--toggle"
                        type="button"
                        onClick={() => handleToggleAdminStatus(admin)}
                        title={admin.is_active ? "Deactivate" : "Activate"}
                      >
                        {admin.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="admin-action-btn admin-action-btn--delete"
                        type="button"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowDeleteConfirm(true);
                        }}
                        title="Delete admin"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
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
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowSchoolModal(false)}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={handleCreateSchool}>
              <div className="admin-field">
                <label>School Name</label>
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
                <label>Location</label>
                <input
                  name="location"
                  value={schoolForm.location}
                  onChange={handleSchoolChange}
                />
                {schoolErrors.location && (
                  <div className="admin-error">{schoolErrors.location}</div>
                )}
              </div>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowSchoolModal(false)}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit">
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
                <div className="admin-card-title">Create School Admin</div>
                <div className="admin-card-subtitle">
                  Assign a school administrator to a registered school.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowAdminModal(false)}
              >
                Close
              </button>
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
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit">
                  Create School Admin
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
                <div className="admin-card-title">Edit School Admin</div>
                <div className="admin-card-subtitle">
                  Update school admin information.
                </div>
              </div>
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowEditAdminModal(false)}
              >
                Close
              </button>
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
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowEditAdminModal(false)}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit">
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
                  Are you sure you want to permanently delete this school admin account?
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
                className="admin-ghost-btn"
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
                }}
              >
                Cancel
              </button>
              <button
                className="admin-danger-btn"
                type="button"
                onClick={handleDeleteAdmin}
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
              <button
                className="admin-link-btn"
                type="button"
                onClick={() => setShowEditSchoolModal(false)}
              >
                Close
              </button>
            </div>
            <form className="admin-form" onSubmit={handleEditSchool}>
              <div className="admin-field">
                <label>School Name</label>
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
                <label>Location</label>
                <input
                  name="location"
                  value={editSchoolForm.location}
                  onChange={(e) => {
                    setEditSchoolForm((prev) => ({ ...prev, location: e.target.value }));
                    setEditSchoolErrors((prev) => ({ ...prev, location: "" }));
                  }}
                />
                {editSchoolErrors.location && (
                  <div className="admin-error">{editSchoolErrors.location}</div>
                )}
              </div>
              {error && <div className="admin-error">{error}</div>}
              <div className="admin-modal-actions">
                <button
                  className="admin-ghost-btn"
                  type="button"
                  onClick={() => setShowEditSchoolModal(false)}
                >
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit">
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
                className="admin-ghost-btn"
                type="button"
                onClick={() => {
                  setShowDeleteSchoolConfirm(false);
                  setSelectedSchool(null);
                }}
              >
                Cancel
              </button>
              <button
                className="admin-danger-btn"
                type="button"
                onClick={handleDeleteSchool}
              >
                Delete School
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NationalAdminDashboard;
