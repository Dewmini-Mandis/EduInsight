import React, { useState, useEffect, useRef } from "react";
import { getToken, getUser, setUser as setAuthUser } from "../../auth/authUtils";
import { UserCheck, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import "../../styles/admin-teachers.css";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const SystemAdminProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/me/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile details.");
      const data = await res.json();
      setProfile(data);
      setAuthUser(data);
      setFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setGeneralError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "firstName":
        if (!value.trim()) return "First name is required.";
        return "";
      case "lastName":
        if (!value.trim()) return "Last name is required.";
        return "";
      case "email":
        if (!value.trim()) return "Email address is required.";
        if (!isValidEmail(value)) return "Enter a valid email address.";
        return "";
      case "currentPassword":
        if (formData.newPassword && !value) {
          return "Current password is required to set a new password.";
        }
        return "";
      case "newPassword":
        if (value && value.length < 8) {
          return "Password must be at least 8 characters long.";
        }
        return "";
      case "confirmPassword":
        if (formData.newPassword && value !== formData.newPassword) {
          return "Passwords do not match.";
        }
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = (formData as any)[field] || "";
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setGeneralError("");
    setSuccessMessage("");
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSuccessMessage("");

    const errors: Record<string, string> = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      email: validateField("email", formData.email),
      currentPassword: validateField("currentPassword", formData.currentPassword),
      newPassword: validateField("newPassword", formData.newPassword),
      confirmPassword: validateField("confirmPassword", formData.confirmPassword),
    };

    setFieldErrors(errors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });

    if (errors.firstName) {
      firstNameRef.current?.focus();
      return;
    }
    if (errors.lastName) {
      lastNameRef.current?.focus();
      return;
    }
    if (errors.email) {
      emailRef.current?.focus();
      return;
    }
    if (errors.currentPassword) {
      currentPasswordRef.current?.focus();
      return;
    }
    if (errors.newPassword) {
      newPasswordRef.current?.focus();
      return;
    }
    if (errors.confirmPassword) {
      confirmPasswordRef.current?.focus();
      return;
    }

    setSaving(true);
    const token = getToken();

    const payload: any = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
    };

    if (formData.newPassword) {
      payload.current_password = formData.currentPassword;
      payload.new_password = formData.newPassword;
    }

    try {
      const res = await fetch("/api/accounts/me/", {
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
        if (errData.first_name) mappedErrors.firstName = Array.isArray(errData.first_name) ? errData.first_name.join(" ") : errData.first_name;
        if (errData.last_name) mappedErrors.lastName = Array.isArray(errData.last_name) ? errData.last_name.join(" ") : errData.last_name;
        if (errData.email) mappedErrors.email = Array.isArray(errData.email) ? errData.email.join(" ") : errData.email;
        if (errData.current_password) mappedErrors.currentPassword = Array.isArray(errData.current_password) ? errData.current_password.join(" ") : errData.current_password;
        if (errData.new_password) mappedErrors.newPassword = Array.isArray(errData.new_password) ? errData.new_password.join(" ") : errData.new_password;

        if (Object.keys(mappedErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...mappedErrors }));
          setTouched((prev) => ({
            ...prev,
            ...Object.keys(mappedErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {}),
          }));
        }

        throw new Error(errData.detail || "Failed to update profile information.");
      }

      const updatedUser = await res.json();
      setProfile(updatedUser);
      setAuthUser(updatedUser);
      setFormData((prev) => ({
        ...prev,
        firstName: updatedUser.first_name || "",
        lastName: updatedUser.last_name || "",
        email: updatedUser.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setSuccessMessage("Admin profile updated successfully.");
    } catch (err: any) {
      setGeneralError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.username || "System Admin";
  const userInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");

  if (loading) {
    return (
      <div className="admin-teacher-page-container">
        <div className="admin-card" style={{ padding: "48px", textAlign: "center", color: "var(--admin-text-secondary)" }}>
          Loading admin profile details...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-teacher-page-container">
      {/* Header Card */}
      <div className="admin-header-card">
        <div className="admin-header-left">
          <div className="admin-header-icon-tile">
            <UserCheck size={28} />
          </div>
          <div className="admin-header-title-group">
            <h1 className="admin-header-title">Admin Profile</h1>
            <p className="admin-header-subtitle">Manage your account information and security settings.</p>
          </div>
        </div>
      </div>

      {/* Account Info Card & Summary */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "var(--admin-blue-soft)",
              color: "var(--admin-blue-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: "700",
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--admin-text-primary)", margin: 0 }}>
                {displayName}
              </h2>
              <span className="admin-badge-active">
                <span className="admin-badge-active-dot" />
                Active Account
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--admin-text-secondary)", margin: "4px 0 0 0" }}>
              {profile?.email} • System Administrator
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Form Card */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Account Information</h2>
          <p className="admin-card-subtitle">Update your primary name and email address.</p>
        </div>

        {generalError && (
          <div className="admin-alert-error" style={{ marginBottom: "20px" }}>
            <AlertCircle size={18} />
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="admin-alert-success" style={{ marginBottom: "20px" }}>
            <ShieldCheck size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
          <div className="admin-form-grid">
            {/* First Name */}
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="profile-firstName">
                First Name <span className="admin-required-star">*</span>
              </label>
              <input
                id="profile-firstName"
                ref={firstNameRef}
                type="text"
                aria-required="true"
                aria-invalid={Boolean(touched.firstName && fieldErrors.firstName)}
                aria-describedby={touched.firstName && fieldErrors.firstName ? "firstName-error" : undefined}
                className={`admin-form-input ${touched.firstName && fieldErrors.firstName ? "is-invalid" : ""}`}
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
              />
              {touched.firstName && fieldErrors.firstName && (
                <div id="firstName-error" className="admin-field-error">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.firstName}</span>
                </div>
              )}
            </div>

            {/* Last Name */}
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="profile-lastName">
                Last Name <span className="admin-required-star">*</span>
              </label>
              <input
                id="profile-lastName"
                ref={lastNameRef}
                type="text"
                aria-required="true"
                aria-invalid={Boolean(touched.lastName && fieldErrors.lastName)}
                aria-describedby={touched.lastName && fieldErrors.lastName ? "lastName-error" : undefined}
                className={`admin-form-input ${touched.lastName && fieldErrors.lastName ? "is-invalid" : ""}`}
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
              />
              {touched.lastName && fieldErrors.lastName && (
                <div id="lastName-error" className="admin-field-error">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.lastName}</span>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="admin-form-group admin-form-full-width">
              <label className="admin-form-label" htmlFor="profile-email">
                Email Address <span className="admin-required-star">*</span>
              </label>
              <input
                id="profile-email"
                ref={emailRef}
                type="email"
                aria-required="true"
                aria-invalid={Boolean(touched.email && fieldErrors.email)}
                aria-describedby={touched.email && fieldErrors.email ? "email-error" : undefined}
                className={`admin-form-input ${touched.email && fieldErrors.email ? "is-invalid" : ""}`}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
              />
              {touched.email && fieldErrors.email && (
                <div id="email-error" className="admin-field-error">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>

            {/* Role (Read Only) */}
            <div className="admin-form-group">
              <label className="admin-form-label">System Role</label>
              <input
                type="text"
                disabled
                className="admin-form-input"
                value="System Admin"
                style={{ backgroundColor: "#F1F5F9", color: "#5D78A3", cursor: "not-allowed" }}
              />
            </div>

            {/* Account Status (Read Only) */}
            <div className="admin-form-group">
              <label className="admin-form-label">Account Status</label>
              <input
                type="text"
                disabled
                className="admin-form-input"
                value="Active"
                style={{ backgroundColor: "#F1F5F9", color: "#16A66D", fontWeight: "600", cursor: "not-allowed" }}
              />
            </div>
          </div>

          {/* Account Security Section */}
          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--admin-border-soft)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--admin-text-primary)", margin: "0 0 4px 0" }}>
              Account Security
            </h3>
            <p style={{ fontSize: "13px", color: "var(--admin-text-secondary)", margin: "0 0 20px 0" }}>
              Leave password fields blank if you do not wish to update your password.
            </p>

            <div className="admin-form-grid">
              {/* Current Password */}
              <div className="admin-form-group admin-form-full-width">
                <label className="admin-form-label" htmlFor="profile-currentPassword">
                  Current Password {formData.newPassword ? <span className="admin-required-star">*</span> : "(Optional)"}
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    id="profile-currentPassword"
                    ref={currentPasswordRef}
                    type={showPassword ? "text" : "password"}
                    aria-invalid={Boolean(touched.currentPassword && fieldErrors.currentPassword)}
                    aria-describedby={touched.currentPassword && fieldErrors.currentPassword ? "currentPassword-error" : undefined}
                    className={`admin-form-input ${touched.currentPassword && fieldErrors.currentPassword ? "is-invalid" : ""}`}
                    placeholder="Enter current password"
                    value={formData.currentPassword}
                    onChange={(e) => handleChange("currentPassword", e.target.value)}
                    onBlur={() => handleBlur("currentPassword")}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--admin-text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {touched.currentPassword && fieldErrors.currentPassword && (
                  <div id="currentPassword-error" className="admin-field-error">
                    <AlertCircle size={14} />
                    <span>{fieldErrors.currentPassword}</span>
                  </div>
                )}
              </div>

              {/* New Password */}
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="profile-newPassword">
                  New Password
                </label>
                <input
                  id="profile-newPassword"
                  ref={newPasswordRef}
                  type={showPassword ? "text" : "password"}
                  aria-invalid={Boolean(touched.newPassword && fieldErrors.newPassword)}
                  aria-describedby={touched.newPassword && fieldErrors.newPassword ? "newPassword-error" : undefined}
                  className={`admin-form-input ${touched.newPassword && fieldErrors.newPassword ? "is-invalid" : ""}`}
                  placeholder="Min. 8 characters"
                  value={formData.newPassword}
                  onChange={(e) => handleChange("newPassword", e.target.value)}
                  onBlur={() => handleBlur("newPassword")}
                />
                {touched.newPassword && fieldErrors.newPassword && (
                  <div id="newPassword-error" className="admin-field-error">
                    <AlertCircle size={14} />
                    <span>{fieldErrors.newPassword}</span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="profile-confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="profile-confirmPassword"
                  ref={confirmPasswordRef}
                  type={showPassword ? "text" : "password"}
                  aria-invalid={Boolean(touched.confirmPassword && fieldErrors.confirmPassword)}
                  aria-describedby={touched.confirmPassword && fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                  className={`admin-form-input ${touched.confirmPassword && fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                  placeholder="Re-enter new password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                />
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <div id="confirmPassword-error" className="admin-field-error">
                    <AlertCircle size={14} />
                    <span>{fieldErrors.confirmPassword}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Single Form Actions (Bottom Right) */}
          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => {
                setFormData({
                  firstName: profile?.first_name || "",
                  lastName: profile?.last_name || "",
                  email: profile?.email || "",
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
                setTouched({});
                setFieldErrors({});
                setGeneralError("");
                setSuccessMessage("");
              }}
              style={{ borderRadius: "8px", height: "42px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              disabled={saving}
              style={{ borderRadius: "8px", height: "42px" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemAdminProfilePage;
