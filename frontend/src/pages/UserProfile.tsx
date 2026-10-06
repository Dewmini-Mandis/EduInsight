import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser, setUser as setAuthUser } from "../auth/authUtils";

// Reusable Components
import ProfileCard from "../components/ProfileCard";
import FormSection from "../components/FormSection";

type UserProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: number | null;
  teacher_profile?: {
    classrooms: {id: number; name: string}[];
  };
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
  const [showPassword, setShowPassword] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [classError, setClassError] = useState("");
  
  const isTeacher = user?.role === "TEACHER";
  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const initialsSource = displayName || user?.username || user?.email || "U";
  const initials = initialsSource
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
      const payload: Record<string, any> = {
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

  const handleRemoveClass = async (classId: number, className: string) => {
    setClassError("");
    const token = getToken();
    try {
      const res = await fetch("/api/classes/teacher-assignments/remove-classroom/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ classroom_id: classId })
      });
      if (res.ok) {
        const userRes = await fetch("/api/accounts/me/", {
          headers: { Authorization: `Token ${token}` }
        });
        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data);
          setAuthUser(data);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setClassError(errData.detail || `Failed to remove ${className}.`);
      }
    } catch (err) {
      setClassError("Error connecting to server.");
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setAddingClass(true);
    setClassError("");
    const token = getToken();
    try {
      const res = await fetch("/api/classes/classrooms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ name: newClassName.trim() })
      });
      if (res.ok) {
        setNewClassName("");
        const userRes = await fetch("/api/accounts/me/", {
          headers: { Authorization: `Token ${token}` }
        });
        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data);
          setAuthUser(data);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setClassError(errData.detail || errData.name?.[0] || "Failed to add class.");
      }
    } catch (err) {
      setClassError("Error connecting to server.");
    } finally {
      setAddingClass(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;

  if (isTeacher) {
    return (
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* Left Column */}
        <div style={{ flex: "1" }}>
          <ProfileCard 
            name={displayName || user?.username || ""}
            role="Senior Mathematics Teacher"
            email={user?.email || ""}
            initials={initials}
            details={[
              { label: "Employee ID", value: "EMP-2023-089" },
              { label: "Department", value: "Mathematics" },
              { label: "Joined Date", value: "Aug 15, 2023" },
              { label: "Classes Assigned", value: "3" }
            ]}
          />
        </div>

        {/* Right Column */}
        <div style={{ flex: "2" }}>
          <FormSection title="Account Settings">
            {error && <div style={{ backgroundColor: "rgba(245, 34, 61, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
            {successMessage && <div style={{ backgroundColor: "rgba(24, 182, 91, 0.1)", color: "var(--success)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{successMessage}</div>}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>First Name *</label>
                  <input 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                  />
                  {formErrors.firstName && <span style={{ color: "var(--danger)", fontSize: "12px" }}>{formErrors.firstName}</span>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Last Name *</label>
                  <input 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                  />
                  {formErrors.lastName && <span style={{ color: "var(--danger)", fontSize: "12px" }}>{formErrors.lastName}</span>}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Email Address</label>
                <input 
                  value={user?.email || ""}
                  disabled
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface-muted)", color: "var(--text-secondary)", cursor: "not-allowed" }}
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Contact system administrator to change email.</p>
              </div>

              {isTeacher && (
                <>
                  <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
                  
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", margin: 0 }}>Classrooms</h4>
                  <div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>These are your assigned classrooms. You can also add new classes below.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      {(user?.teacher_profile?.classrooms || []).map((cls) => (
                        <div key={cls.id} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--blue-50)", color: "var(--blue-600)", padding: "6px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: "500" }}>
                          <span>{cls.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveClass(cls.id, cls.name)}
                            title={`Remove ${cls.name}`}
                            style={{ background: "none", border: "none", color: "var(--blue-600)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px", fontSize: "14px", fontWeight: "700", lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(user?.teacher_profile?.classrooms || []).length === 0 && <span style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No classrooms assigned yet.</span>}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                      <input
                        type="text"
                        placeholder="Enter new class name (e.g. Grade 10-A)"
                        value={newClassName}
                        onChange={(e) => { setNewClassName(e.target.value); setClassError(""); }}
                        style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "13px", outline: "none", backgroundColor: "var(--surface)" }}
                      />
                      <button
                        type="button"
                        onClick={handleAddClass}
                        disabled={addingClass || !newClassName.trim()}
                        style={{
                          padding: "10px 18px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: newClassName.trim() ? "#126BFF" : "#94A3B8",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: newClassName.trim() ? "pointer" : "not-allowed"
                        }}
                      >
                        {addingClass ? "Adding..." : "+ Add Class"}
                      </button>
                    </div>
                    {classError && <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>{classError}</span>}
                  </div>
                </>
              )}

              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", margin: 0 }}>Change Password</h4>

              {/* Hidden input to prevent Chrome from autofilling email into the classroom field */}
              <input type="text" name="username_trap" style={{ display: "none" }} autoComplete="username" />

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input 
                    name="currentPassword"
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {formErrors.currentPassword && <span style={{ color: "var(--danger)", fontSize: "12px" }}>{formErrors.currentPassword}</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input 
                      name="newPassword"
                      autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                    />
                  </div>
                  {formErrors.newPassword && <span style={{ color: "var(--danger)", fontSize: "12px" }}>{formErrors.newPassword}</span>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input 
                      name="confirmPassword"
                      autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                    />
                  </div>
                  {formErrors.confirmPassword && <span style={{ color: "var(--danger)", fontSize: "12px" }}>{formErrors.confirmPassword}</span>}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                <button
                  type="submit"
                  style={{ padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                >
                  Update Profile
                </button>
              </div>
            </form>
          </FormSection>
        </div>
      </div>
    );
  }

  // Fallback for non-teacher roles to keep existing layout if necessary
  return (
    <div style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
       <h2>Profile</h2>
       {/* Kept minimal for other roles to not break anything if they navigate here */}
    </div>
  );
};

export default UserProfilePage;
