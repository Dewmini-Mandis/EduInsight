import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { Edit3, ArrowLeft, RefreshCw } from "lucide-react";
import SuccessBanner from "../../components/SuccessBanner";
import "../../styles/teacher.css";

type StudentProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  school_name?: string;
  student_profile?: {
    index_no: string;
    class_name: string;
    grade: string;
    class_room?: { id: number; name: string };
  };
};

const EditStudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudentProfile> & { password?: string, index_no?: string, class_name?: string, class_room_id?: number | "" }>({});

  // Validation state
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Input refs for focus on error
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const classRoomIdRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      try {
        const res = await fetch(`/api/accounts/users/${studentId}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error("Could not load student profile.");
        const data = await res.json() as StudentProfile;
        
        setEditForm({
          ...data,
          index_no: data.student_profile?.index_no || "",
          class_name: data.student_profile?.class_room?.name || data.student_profile?.class_name || "",
          class_room_id: data.student_profile?.class_room?.id || ""
        });
      } catch (err: any) {
        setLoadError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId]);

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case "first_name":
        if (!value || !String(value).trim()) return "First name is required.";
        return "";
      case "last_name":
        if (!value || !String(value).trim()) return "Last name is required.";
        return "";
      case "email":
        if (!value || !String(value).trim()) return "Email address is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return "Enter a valid email address.";
        return "";
      case "password":
        if (value && String(value).trim().length > 0 && String(value).trim().length < 6) {
          return "Password must be at least 6 characters.";
        }
        return "";
      case "class_room_id":
        if (value === "" || value === null || value === undefined) return "Class assignment is required.";
        return "";
      default:
        return "";
    }
  };

  const validateAll = (): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};
    const fnErr = validateField("first_name", editForm.first_name);
    if (fnErr) newErrors.first_name = fnErr;

    const lnErr = validateField("last_name", editForm.last_name);
    if (lnErr) newErrors.last_name = lnErr;

    const emailErr = validateField("email", editForm.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validateField("password", editForm.password);
    if (passErr) newErrors.password = passErr;

    const classErr = validateField("class_room_id", editForm.class_room_id);
    if (classErr) newErrors.class_room_id = classErr;

    return newErrors;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let val: any;
    if (field === "first_name") val = editForm.first_name;
    if (field === "last_name") val = editForm.last_name;
    if (field === "email") val = editForm.email;
    if (field === "password") val = editForm.password;
    if (field === "class_room_id") val = editForm.class_room_id;

    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setApiError("");

    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
      class_room_id: true,
    });

    const newErrors = validateAll();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.first_name) firstNameRef.current?.focus();
      else if (newErrors.last_name) lastNameRef.current?.focus();
      else if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) passwordRef.current?.focus();
      else if (newErrors.class_room_id) classRoomIdRef.current?.focus();
      return;
    }

    setIsSaving(true);
    const token = getToken();
    try {
      const res = await fetch(`/api/accounts/users/${studentId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          index_no: editForm.index_no,
          class_name: editForm.class_name,
          class_room_id: editForm.class_room_id ? Number(editForm.class_room_id) : null,
          ...(editForm.password ? { password: editForm.password } : {})
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        const backendErrors: { [key: string]: string } = {};
        if (errData.email) backendErrors.email = Array.isArray(errData.email) ? errData.email[0] : errData.email;
        if (errData.first_name) backendErrors.first_name = Array.isArray(errData.first_name) ? errData.first_name[0] : errData.first_name;
        if (errData.last_name) backendErrors.last_name = Array.isArray(errData.last_name) ? errData.last_name[0] : errData.last_name;
        if (errData.password) backendErrors.password = Array.isArray(errData.password) ? errData.password[0] : errData.password;
        if (errData.class_room_id) backendErrors.class_room_id = Array.isArray(errData.class_room_id) ? errData.class_room_id[0] : errData.class_room_id;

        if (Object.keys(backendErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...backendErrors }));
        }
        const msg = typeof errData === "object" ? (errData.detail || errData.non_field_errors?.[0] || "Unable to update student. Please try again.") : "Unable to update student. Please try again.";
        throw new Error(msg);
      }

      setSuccessMessage("Student updated successfully.");
      setTimeout(() => {
        navigate(`/teacher/students/${studentId}`);
      }, 1000);
    } catch (err: any) {
      setApiError(err.message || "Unable to update student. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldStyle = (field: string) => {
    const isInvalid = touched[field] && !!errors[field];
    return {
      width: "100%",
      height: "44px",
      padding: "0 14px",
      borderRadius: "9px",
      border: `1px solid ${isInvalid ? "#FF4054" : "#DCE6F3"}`,
      backgroundColor: isInvalid ? "#FFF8F9" : "#FFFFFF",
      fontSize: "14px",
      color: "#0B1F3A",
      outline: "none",
      boxSizing: "border-box" as const,
      boxShadow: isInvalid ? "0 0 0 3px rgba(255, 64, 84, 0.10)" : "none",
      transition: "all 0.2s ease"
    };
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>Loading student profile...</div>;
  if (loadError) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054", fontFamily: '"Inter", sans-serif' }}>{loadError}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* PART 3: Professional Page Header */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "18px 20px",
        border: "1px solid #E4ECF6",
        boxShadow: "0 6px 20px rgba(18,63,110,0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#F1EDFF",
            color: "#6C4BFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Edit3 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 700, color: "#0B1F3A", margin: 0, letterSpacing: "-0.5px" }}>
              Edit Student
            </h1>
            <p style={{ fontSize: "15px", color: "#5D78A3", margin: "4px 0 0 0" }}>
              Update the student’s information and account details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/teacher/students`)}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "9px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #DCE6F3",
            color: "#3D5E8A",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <ArrowLeft size={16} /> Back to Students
        </button>
      </div>

      {successMessage && (
        <SuccessBanner 
          message={successMessage} 
          onClose={() => setSuccessMessage("")} 
        />
      )}

      {/* Form Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Student Information</h2>
          <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 24px 0" }}>Update the student’s details below.</p>
          
          {apiError && (
            <div role="alert" style={{ padding: "12px 16px", borderRadius: "9px", backgroundColor: "#FFF8F9", border: "1px solid #FF4054", color: "#FF4054", fontSize: "13.5px", fontWeight: 500, marginBottom: "20px" }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSave} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* First Name | Last Name */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  First Name <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
                </label>
                <input 
                  ref={firstNameRef}
                  type="text" 
                  value={editForm.first_name || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    setEditForm({ ...editForm, first_name: val });
                    if (touched.first_name) {
                      setErrors(prev => ({ ...prev, first_name: validateField("first_name", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("first_name")}
                  aria-required="true"
                  aria-invalid={touched.first_name && !!errors.first_name}
                  aria-describedby="first_name-error"
                  style={getFieldStyle("first_name")}
                />
                {touched.first_name && errors.first_name && (
                  <div id="first_name-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                    {errors.first_name}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  Last Name <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
                </label>
                <input 
                  ref={lastNameRef}
                  type="text" 
                  value={editForm.last_name || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    setEditForm({ ...editForm, last_name: val });
                    if (touched.last_name) {
                      setErrors(prev => ({ ...prev, last_name: validateField("last_name", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("last_name")}
                  aria-required="true"
                  aria-invalid={touched.last_name && !!errors.last_name}
                  aria-describedby="last_name-error"
                  style={getFieldStyle("last_name")}
                />
                {touched.last_name && errors.last_name && (
                  <div id="last_name-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                    {errors.last_name}
                  </div>
                )}
              </div>
            </div>

            {/* Email | Index Number */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  Email Address <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
                </label>
                <input 
                  ref={emailRef}
                  type="email" 
                  value={editForm.email || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    setEditForm({ ...editForm, email: val });
                    if (touched.email) {
                      setErrors(prev => ({ ...prev, email: validateField("email", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("email")}
                  aria-required="true"
                  aria-invalid={touched.email && !!errors.email}
                  aria-describedby="email-error"
                  style={getFieldStyle("email")}
                />
                {touched.email && errors.email && (
                  <div id="email-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                    {errors.email}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  Index Number
                </label>
                <input 
                  type="text" 
                  value={editForm.index_no || ""} 
                  onChange={e => setEditForm({ ...editForm, index_no: e.target.value })}
                  style={getFieldStyle("index_no")}
                />
              </div>
            </div>

            {/* Password | Class Assignment */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  New Password (Optional)
                </label>
                <div style={{ position: "relative" }}>
                  <input 
                    ref={passwordRef}
                    type="text" 
                    value={editForm.password || ""} 
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, password: val });
                      if (touched.password) {
                        setErrors(prev => ({ ...prev, password: validateField("password", val) }));
                      }
                    }}
                    onBlur={() => handleBlur("password")}
                    placeholder="Leave blank to keep current password"
                    aria-invalid={touched.password && !!errors.password}
                    aria-describedby="password-error"
                    style={{ ...getFieldStyle("password"), paddingRight: "90px" }}
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const gen = Math.random().toString(36).slice(-8);
                      setEditForm({ ...editForm, password: gen });
                      if (touched.password) setErrors(prev => ({ ...prev, password: validateField("password", gen) }));
                    }}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#126BFF",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <RefreshCw size={13} /> Generate
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div id="password-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                    {errors.password}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                  Classroom Assignment <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
                </label>
                {teacherClassrooms.length > 0 ? (
                  <select 
                    ref={classRoomIdRef}
                    value={editForm.class_room_id || ""} 
                    onChange={e => {
                      const selectedId = Number(e.target.value) || "";
                      const selectedCls = teacherClassrooms.find((c: any) => c.id === selectedId);
                      setEditForm({
                        ...editForm,
                        class_room_id: selectedId,
                        class_name: selectedCls?.name || editForm.class_name || ""
                      });
                      if (touched.class_room_id) {
                        setErrors(prev => ({ ...prev, class_room_id: validateField("class_room_id", selectedId) }));
                      }
                    }}
                    onBlur={() => handleBlur("class_room_id")}
                    aria-required="true"
                    aria-invalid={touched.class_room_id && !!errors.class_room_id}
                    aria-describedby="class_room_id-error"
                    style={{
                      ...getFieldStyle("class_room_id"),
                      appearance: "none",
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B1F3A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                      backgroundSize: "10px auto",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">Select a classroom...</option>
                    {teacherClassrooms.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: "12px", borderRadius: "9px", backgroundColor: "#FFF8F9", border: "1px solid #FF4054", color: "#FF4054", fontSize: "13px", fontWeight: 500 }}>
                    No classes are assigned to your account. Please contact the administrator.
                  </div>
                )}
                {touched.class_room_id && errors.class_room_id && (
                  <div id="class_room_id-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                    {errors.class_room_id}
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "#E4ECF6", margin: "8px 0" }}></div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                type="button"
                onClick={() => navigate(`/teacher/students/${studentId}`)}
                style={{ height: "42px", padding: "0 20px", borderRadius: "9px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#3D5E8A", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                style={{ height: "42px", padding: "0 24px", borderRadius: "9px", background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, border: "none", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1, boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStudentProfile;
