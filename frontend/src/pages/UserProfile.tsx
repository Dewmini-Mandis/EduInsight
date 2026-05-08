import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../auth/authUtils";
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch("/api/accounts/me/", {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error("Unable to load profile");
        const data = (await res.json()) as UserProfile;
        setUser(data);
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
    if (!formData.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!formData.lastName.trim())
      nextErrors.lastName = "Last name is required.";

    if (formData.newPassword || formData.currentPassword) {
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

    if (!validateForm()) return;

    try {
      const token = getToken();
      const payload: Record<string, string> = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      };

      if (formData.newPassword) {
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

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading profile...</div>;
  }

  if (!user) {
    return <div style={{ padding: "2rem" }}>Unable to load profile.</div>;
  }

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo" />
          <div>
            <div className="admin-brand-title">EduInsight</div>
            <div className="admin-brand-sub">{user.role.replace(/_/g, " ")}</div>
          </div>
        </div>
        <div className="admin-sidebar-footer">
          <button
            className="admin-ghost-btn"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
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
            <div className="admin-title">User Profile</div>
            <div className="admin-subtitle">Manage your account information.</div>
          </div>
        </header>

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
                  Update your name and password. Email and username cannot be changed.
                </div>
              </div>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Email Address</label>
                  <input type="email" value={user.email} disabled />
                  <div className="admin-hint">Email cannot be changed.</div>
                </div>
                <div className="admin-field">
                  <label>Username</label>
                  <input type="text" value={user.username} disabled />
                  <div className="admin-hint">Username cannot be changed.</div>
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
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
                  />
                  {formErrors.lastName && (
                    <div className="admin-error">{formErrors.lastName}</div>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field">
                  <label>Role</label>
                  <input type="text" value={user.role.replace(/_/g, " ")} disabled />
                  <div className="admin-hint">Role cannot be changed.</div>
                </div>
              </div>

              <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "2rem" }}>
                <div className="admin-card-title" style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                  Change Password (Optional)
                </div>
                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Enter current password"
                    />
                    {formErrors.currentPassword && (
                      <div className="admin-error">{formErrors.currentPassword}</div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-field">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                    {formErrors.newPassword && (
                      <div className="admin-error">{formErrors.newPassword}</div>
                    )}
                  </div>
                  <div className="admin-field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                    />
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
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default UserProfilePage;
