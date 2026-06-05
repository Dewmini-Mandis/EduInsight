import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser, setUser as setAuthUser } from "../auth/authUtils";
import "../styles/admin.css";

type UserProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: number | null;
};

const UserProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(() => getUser() as UserProfile | null);
  const [loading, setLoading] = useState(() => !getUser());
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(() => {
    const u = getUser() as UserProfile | null;
    return {
      firstName: u?.first_name || "",
      lastName: u?.last_name || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isStudent = user?.role === "STUDENT";
  const isTeacher = user?.role === "TEACHER";
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const isNationalAdmin = user?.role === "NATIONAL_ADMIN";
  const isSystemAdmin = user?.role === "SYSTEM_ADMIN";
  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "PROFILE";
  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const userDisplayName = displayName || user?.username || "User";
  const contactLine = user?.email || user?.username || "";
  const initialsSource = displayName || user?.username || user?.email || "U";
  const userInitials = initialsSource
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch("/api/accounts/me/", {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error("Unable to load profile");
        const data = (await res.json()) as UserProfile;
        setUser(data);
        setAuthUser(data);
        setFormData({
          firstName: data.first_name,
          lastName: data.last_name,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (err: any) {
        setError(err.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMessage("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!isStudent) {
      if (!formData.firstName.trim())
        nextErrors.firstName = "First name is required.";
      if (!formData.lastName.trim())
        nextErrors.lastName = "Last name is required.";
    }

    if (!isStudent && (formData.newPassword || formData.currentPassword)) {
      if (!formData.currentPassword) {
        nextErrors.currentPassword = "Current password is required to change password.";
      }
      if (!formData.newPassword) {
        nextErrors.newPassword = "New password is required.";
      } else if (formData.newPassword.length < 8) {
        nextErrors.newPassword = "Password must be at least 8 characters.";
      }
      if (formData.newPassword !== formData.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isStudent) return;

    if (!validateForm()) return;

    try {
      const token = getToken();
      const payload: Record<string, string> = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      };

      if (formData.newPassword) {
        payload.current_password = formData.currentPassword;
        payload.new_password = formData.newPassword;
      }

      const res = await fetch("/api/accounts/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        if (errorPayload && typeof errorPayload === "object") {
          const nextErrors: Record<string, string> = {};
          Object.entries(errorPayload).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              nextErrors[key] = value.join(" ");
            } else if (typeof value === "string") {
              nextErrors[key] = value;
            }
          });
          setFormErrors(nextErrors);
        }
        throw new Error(errorPayload?.detail || "Unable to update profile");
      }

      const updatedUser = (await res.json()) as UserProfile;
      setUser(updatedUser);
      setFormData({
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccessMessage("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message || "Unable to update profile");
    }
  };

  if (!user && !loading) {
    return <div style={{ padding: "2rem" }}>Unable to load profile.</div>;
  }

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand">
            <div className="admin-logo" />
            <div>
              <div className="admin-brand-title">EduInsight</div>
              <div className="admin-brand-sub">{roleLabel}</div>
            </div>
          </div>
          <nav className="admin-nav">
            {isSystemAdmin && (
              <>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Users
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Schools
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Security
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Settings
                </button>
              </>
            )}
            {isNationalAdmin && (
              <>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Schools
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Users
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  National Reports
                </button>
              </>
            )}
            {isSchoolAdmin && (
              <>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Teachers
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Students
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Class Setup
                </button>
              </>
            )}
            {isTeacher && (
              <>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Class Analytics
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Risk Alerts
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Recommendations
                </button>
              </>
            )}
            {isStudent && (
              <>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  My Progress
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Assigned Quizzes
                </button>
                <button className="admin-nav-item" type="button" onClick={() => navigate("/dashboard")}>
                  Recommendations
                </button>
              </>
            )}
            <button className="admin-nav-item active" type="button">
              Profile
            </button>
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{userInitials}</div>
            <div>
              <div className="admin-user-name">{userDisplayName}</div>
              <div className="admin-user-email">{contactLine}</div>
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
        <div className="admin-topbar" style={{ marginBottom: "2rem" }}>
          <div>
            <div className="admin-title">User Profile</div>
            <div className="admin-subtitle">Manage your account information.</div>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-profile">
              <div className="admin-profile-avatar" />
              <div>
                <div className="admin-user-name">{userDisplayName}</div>
                <div className="admin-profile-meta">{roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="admin-success" role="status">
            {successMessage}
          </div>
        )}

        <section className="admin-content-grid admin-content-grid--single">
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-title">Account Information</div>
                <div className="admin-card-subtitle">
                  {isStudent
                    ? "Students can view profile details only."
                    : "Update your name and password."}
                </div>
              </div>
            </div>
            {loading ? (
              <div className="admin-empty">Loading profile...</div>
            ) : (
              <form className="admin-form" onSubmit={handleSubmit}>
              {!isStudent && (
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Email Address</label>
                    <input type="email" value={user?.email || ""} disabled />
                  </div>
                </div>
              )}

              {isStudent && (
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Username</label>
                    <input type="text" value={user?.username || ""} disabled />
                  </div>
                </div>
              )}

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    disabled={isStudent}
                  />
                  {formErrors.firstName && (
                    <div className="admin-error">{formErrors.firstName}</div>
                  )}
                </div>
                <div className="admin-field">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    disabled={isStudent}
                  />
                  {formErrors.lastName && (
                    <div className="admin-error">{formErrors.lastName}</div>
                  )}
                </div>
              </div>

              {!isStudent && (
                <>
                  <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "2rem" }}>
                    <div className="admin-card-title" style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                      Change Password (Optional)
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-field">
                        <label>Current Password</label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            style={{ paddingRight: "40px", width: "100%" }}
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                          >
                            {showCurrentPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                        {formErrors.currentPassword && (
                          <div className="admin-error">{formErrors.currentPassword}</div>
                        )}
                      </div>
                    </div>

                    <div className="admin-form-row">
                      <div className="admin-field">
                        <label>New Password</label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            style={{ paddingRight: "40px", width: "100%" }}
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
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
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                        {formErrors.newPassword && (
                          <div className="admin-error">{formErrors.newPassword}</div>
                        )}
                      </div>
                      <div className="admin-field">
                        <label>Confirm New Password</label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            style={{ paddingRight: "40px", width: "100%" }}
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                        {formErrors.confirmPassword && (
                          <div className="admin-error">{formErrors.confirmPassword}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="admin-modal-actions" style={{ marginTop: "2rem" }}>
                    <button
                      className="admin-ghost-btn"
                      type="button"
                      onClick={() => navigate("/dashboard")}
                    >
                      Cancel
                    </button>
                    <button className="admin-primary-btn" type="submit">
                      Save Changes
                    </button>
                  </div>
                </>
              )}
                </form>
              )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default UserProfilePage;
