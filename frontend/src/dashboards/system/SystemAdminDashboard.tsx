import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import "../../styles/admin.css";

type SystemUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role?: string | null;
  is_active: boolean;
};

type CurrentUser = {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const SystemAdminDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser() as CurrentUser | null;
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [schoolsCount, setSchoolsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const loadUsers = async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, schoolsRes] = await Promise.all([
        fetch("/api/accounts/users/", {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch("/api/schools/", {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);
      if (!usersRes.ok) throw new Error("Failed to load users");
      if (!schoolsRes.ok) throw new Error("Failed to load schools");
      const usersData = (await usersRes.json()) as SystemUser[];
      const schoolsData = (await schoolsRes.json()) as any[];
      setUsers(usersData);
      setSchoolsCount(Array.isArray(schoolsData) ? schoolsData.length : 0);
    } catch (err: any) {
      setError(err?.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      setLoading(false);
      return;
    }

    loadUsers(token);
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.id - b.id);
  }, [users]);

  const formatRole = (role?: string | null) => {
    if (!role) return "Unknown";
    return role
      .toLowerCase()
      .split("_")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  };

  const getInitials = (user: SystemUser) => {
    const source = user.full_name || `${user.first_name} ${user.last_name}`.trim();
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

  const currentInitials = useMemo(() => {
    if (!currentUser) return "NA";
    const source = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    if (source) {
      return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
    return (currentUser.username || currentUser.email || "U").slice(0, 2).toUpperCase();
  }, [currentUser]);

  const currentDisplayName = useMemo(() => {
    if (!currentUser) return "System Admin";
    const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
    return fullName || "System Admin";
  }, [currentUser]);

  const handleCreateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateCreateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!createForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!createForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!createForm.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!createForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (createForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    setCreateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editForm.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!editForm.lastName.trim()) nextErrors.lastName = "Last name is required.";
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateNationalAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!validateCreateForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    try {
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: createForm.firstName.trim(),
          last_name: createForm.lastName.trim(),
          email: createForm.email.trim(),
          username: createForm.email.trim(),
          password: createForm.password,
          role: "NATIONAL_ADMIN",
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
          setCreateErrors(nextErrors);
        }
        throw new Error(payload?.detail || "Unable to create national admin");
      }

      setShowCreateModal(false);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "" });
      await loadUsers(token);
      setSuccessMessage("National admin created successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to create national admin");
    }
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setSelectedUser(user);
    setEditForm({ firstName: user.first_name || "", lastName: user.last_name || "" });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;
    setError("");
    setSuccessMessage("");
    if (!validateEditForm()) return;
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    try {
      const res = await fetch(`/api/accounts/users/${selectedUser.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
        }),
      });

      if (!res.ok) throw new Error("Unable to update user");
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers(token);
      setSuccessMessage("User updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update user");
    }
  };

  const handleToggleUser = async (user: SystemUser) => {
    setError("");
    setSuccessMessage("");
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    try {
      const res = await fetch(`/api/accounts/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) throw new Error("Unable to update status");
      await loadUsers(token);
      setSuccessMessage("User status updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update status");
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    const confirmed = window.confirm(
      `Delete ${user.first_name || ""} ${user.last_name || ""}? This cannot be undone.`
    );
    if (!confirmed) return;
    setError("");
    setSuccessMessage("");
    const token = getToken();
    if (!token) {
      setError("Missing authentication token.");
      return;
    }
    try {
      const res = await fetch(`/api/accounts/users/${user.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Unable to delete user");
      await loadUsers(token);
      setSuccessMessage("User deleted successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to delete user");
    }
  };

  const filteredUsers = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return sortedUsers.filter((user) => {
      const roleValue = (user.role || "unknown").toLowerCase();
      const statusValue = user.is_active ? "active" : "inactive";
      const fullName = user.full_name || `${user.first_name} ${user.last_name}`.trim();
      const matchesQuery =
        !query ||
        [user.username, user.email, fullName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesRole = filterRole === "all" || roleValue === filterRole;
      const matchesStatus = filterStatus === "all" || statusValue === filterStatus;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [filterQuery, filterRole, filterStatus, sortedUsers]);

  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((user) => {
      if (user.role) roles.add(user.role.toLowerCase());
    });
    return Array.from(roles).sort();
  }, [users]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div>
              <div className="admin-brand-title">EduInsight</div>
              <div className="admin-brand-sub">SYSTEM ADMIN</div>
            </div>
          </div>
          <nav className="admin-nav">
            <button className="admin-nav-item active" type="button">
              Dashboard
            </button>
            <button className="admin-nav-item" type="button">
              Users
            </button>
            <button className="admin-nav-item" type="button">
              Security
            </button>
            <button className="admin-nav-item" type="button">
              Settings
            </button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{currentInitials}</div>
            <div>
              <div className="admin-user-name">{currentDisplayName}</div>
              <div className="admin-user-email">
                {currentUser?.email || "sysadmin@eduinsight.local"}
              </div>
            </div>
          </div>
          <button className="admin-ghost-btn" type="button" onClick={() => navigate("/logout")}>Sign Out</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <div className="admin-title">System Administration</div>
            <div className="admin-subtitle">Overview of national system operations</div>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-profile">
              <div className="admin-profile-avatar" />
              <div>
                <div className="admin-user-name">Admin Panel</div>
                <div className="admin-profile-meta">System Administrator</div>
              </div>
            </div>
          </div>
        </div>

        <section className="admin-metrics-grid admin-metrics-grid--three">
          <div className="metric-card">
            <div className="metric-title">TOTAL USERS</div>
            <div className="metric-value">{totalUsers}</div>
            <div className="metric-badge">All roles</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">ACTIVE USERS</div>
            <div className="metric-value">{activeUsers}</div>
            <div className="metric-badge">Currently enabled</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">SCHOOLS</div>
            <div className="metric-value">{schoolsCount}</div>
            <div className="metric-badge">Registered schools</div>
          </div>
        </section>

        <div className="admin-user-toolbar">
          <div className="admin-user-filters">
            <input
              className="admin-filter-input"
              placeholder="Search users by name or email"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
            />
            <select
              className="admin-filter-select"
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
            <select
              className="admin-filter-select"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button className="admin-login-btn" type="button" onClick={() => setShowCreateModal(true)}>
            Add User
          </button>
        </div>

        <section className="admin-content-grid admin-content-grid--single">
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-title">User Management</div>
                <div className="admin-card-subtitle">Manage credentials and access levels across all roles</div>
              </div>
            </div>
            {error && <div className="admin-error">{error}</div>}
            {successMessage && <div className="admin-success">{successMessage}</div>}
            <div className="admin-table">
              <div className="admin-table-header">
                <span>User</span>
                <span>Role</span>
                <span>Status</span>
                <span>Last Login</span>
                <span>Actions</span>
              </div>
              {loading && <div className="admin-empty">Loading users...</div>}
              {!loading && filteredUsers.length === 0 && (
                <div className="admin-empty">No users found.</div>
              )}
              {filteredUsers.map((user) => (
                <div className="admin-table-row" key={user.id}>
                  <div className="admin-user-cell">
                    <div className="admin-avatar">{getInitials(user)}</div>
                    <div>
                      <div className="user-name">
                        {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username}
                      </div>
                      <div className="user-meta">{user.email}</div>
                    </div>
                  </div>
                  <div className="user-meta">{formatRole(user.role)}</div>
                  <div>
                    <span className={`status-pill ${user.is_active ? "status-active" : "status-suspended"}`}>
                      {user.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div className="user-meta">—</div>
                  {user.role?.toUpperCase() === "SYSTEM_ADMIN" ? (
                    <div className="user-meta">—</div>
                  ) : (
                    <div className="admin-action-group">
                      <button
                        className="admin-action-btn"
                        type="button"
                        onClick={() => handleOpenEditModal(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-action-btn warning"
                        type="button"
                        onClick={() => handleToggleUser(user)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="admin-action-btn danger"
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-card admin-logs">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-title">System Access Logs</div>
              <div className="admin-card-subtitle">Real-time monitoring of administrative activity</div>
            </div>
            <button className="admin-secondary-btn" type="button">DOWNLOAD FULL AUDIT LOG (CSV)</button>
          </div>
          <div className="admin-log-item">
            <div>
              <div className="user-name">Admin Panel logged in from 192.168.1.45</div>
              <div className="admin-log-meta">October 14, 2023 - 09:42:12</div>
            </div>
            <div className="admin-log-status success">SUCCESS</div>
          </div>
          <div className="admin-log-item">
            <div>
              <div className="user-name">Unauthorized Access Attempt on API Endpoint /v1/students</div>
              <div className="admin-log-meta">October 14, 2023 - 09:38:05</div>
            </div>
            <div className="admin-log-status blocked">BLOCKED</div>
          </div>
          <div className="admin-log-item">
            <div>
              <div className="user-name">System configuration updated by Amila Samarakoon</div>
              <div className="admin-log-meta">October 14, 2023 - 08:15:33</div>
            </div>
            <div className="admin-log-status">COMPLETED</div>
          </div>
        </section>

        {showCreateModal && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Create National Admin</div>
                  <div className="admin-card-subtitle">
                    Create a national administrator account.
                  </div>
                </div>
                <button
                  className="admin-link-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Close
                </button>
              </div>
              <form className="admin-form" onSubmit={handleCreateNationalAdmin}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>First Name</label>
                    <input
                      name="firstName"
                      value={createForm.firstName}
                      onChange={handleCreateChange}
                    />
                    {createErrors.firstName && (
                      <div className="admin-error">{createErrors.firstName}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Last Name</label>
                    <input
                      name="lastName"
                      value={createForm.lastName}
                      onChange={handleCreateChange}
                    />
                    {createErrors.lastName && (
                      <div className="admin-error">{createErrors.lastName}</div>
                    )}
                  </div>
                </div>
                <div className="admin-field">
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={createForm.email}
                    onChange={handleCreateChange}
                  />
                  {createErrors.email && (
                    <div className="admin-error">{createErrors.email}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Password</label>
                  <input
                    name="password"
                    type="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                  />
                  {createErrors.password && (
                    <div className="admin-error">{createErrors.password}</div>
                  )}
                </div>
                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-ghost-btn"
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="admin-primary-btn" type="submit">
                    Create National Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <div className="admin-card-title">Edit User</div>
                  <div className="admin-card-subtitle">
                    Update user details.
                  </div>
                </div>
                <button
                  className="admin-link-btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                >
                  Close
                </button>
              </div>
              <form className="admin-form" onSubmit={handleEditUser}>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>First Name</label>
                    <input
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleEditChange}
                    />
                    {editErrors.firstName && (
                      <div className="admin-error">{editErrors.firstName}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Last Name</label>
                    <input
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleEditChange}
                    />
                    {editErrors.lastName && (
                      <div className="admin-error">{editErrors.lastName}</div>
                    )}
                  </div>
                </div>
                {error && <div className="admin-error">{error}</div>}
                <div className="admin-modal-actions">
                  <button
                    className="admin-ghost-btn"
                    type="button"
                    onClick={() => setShowEditModal(false)}
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
      </main>
    </div>
  );
};

export default SystemAdminDashboard;
