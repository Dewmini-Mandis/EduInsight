import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";
import { UserPlus, ArrowLeft, RefreshCw, UserCheck } from "lucide-react";
import { queryClient } from "../../api/queryClient";

// Reusable Components
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import SuccessBanner from "../../components/SuccessBanner";

type RecentEntry = {
  id: number;
  name: string;
  email: string;
  indexNo: string;
  className: string;
  dateAdded: string;
  status: "Active" | "Pending";
  initials: string;
};

const formatAddedDate = (dateString?: string): string => {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Date unavailable";

  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `Added on ${day} ${month} ${year}`;
};

const CreateStudent = () => {
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];
  const navigate = useNavigate();

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [password, setPassword] = useState("");
  const [classRoomId, setClassRoomId] = useState<number | "">("");

  // Validation State
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Field Refs for Auto-focusing on Validation Error
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const classRoomIdRef = useRef<HTMLSelectElement>(null);

  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    fetchRecentStudents();
  }, []);

  const fetchRecentStudents = async () => {
    const token = getToken();
    if (!token) return;
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/accounts/users/?role=STUDENT&ordering=-date_joined&limit=5", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const users = data.results || data;
        const entries: RecentEntry[] = users.map((u: any) => {
          const fn = u.first_name || "";
          const ln = u.last_name || "";
          const fullName = `${fn} ${ln}`.trim() || u.username;
          return {
            id: u.id,
            name: fullName,
            email: u.email || "",
            indexNo: u.student_profile?.index_no || "",
            initials: `${fn.charAt(0) || ""}${ln.charAt(0) || ""}`.toUpperCase() || "ST",
            className: u.student_profile?.class_room?.name || u.student_profile?.class_name || "N/A",
            dateAdded: formatAddedDate(u.created_at || u.date_joined),
            status: "Active" as const
          };
        });
        setRecentEntries(entries);
      }
    } catch (err) {
      console.error("Failed to fetch recent students", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case "firstName":
        if (!value || !String(value).trim()) return "First name is required.";
        return "";
      case "lastName":
        if (!value || !String(value).trim()) return "Last name is required.";
        return "";
      case "email":
        if (!value || !String(value).trim()) return "Email address is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return "Enter a valid email address.";
        return "";
      case "password":
        if (!value || !String(value).trim()) return "Temporary password is required.";
        if (String(value).trim().length < 6) return "Password must be at least 6 characters.";
        return "";
      case "classRoomId":
        if (value === "" || value === null || value === undefined) return "Class assignment is required.";
        return "";
      default:
        return "";
    }
  };

  const validateAll = (): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};
    const fnErr = validateField("firstName", firstName);
    if (fnErr) newErrors.firstName = fnErr;

    const lnErr = validateField("lastName", lastName);
    if (lnErr) newErrors.lastName = lnErr;

    const emailErr = validateField("email", email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validateField("password", password);
    if (passErr) newErrors.password = passErr;

    const classErr = validateField("classRoomId", classRoomId);
    if (classErr) newErrors.classRoomId = classErr;

    return newErrors;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let val: any;
    if (field === "firstName") val = firstName;
    if (field === "lastName") val = lastName;
    if (field === "email") val = email;
    if (field === "password") val = password;
    if (field === "classRoomId") val = classRoomId;

    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setSuccessMessage("");

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      classRoomId: true,
    });

    const newErrors = validateAll();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.firstName) firstNameRef.current?.focus();
      else if (newErrors.lastName) lastNameRef.current?.focus();
      else if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) passwordRef.current?.focus();
      else if (newErrors.classRoomId) classRoomIdRef.current?.focus();
      return;
    }

    setSubmitting(true);
    const token = getToken();
    const username = email.split("@")[0] + Math.floor(Math.random() * 1000);

    const payload = {
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      role: "STUDENT",
      index_no: indexNumber,
      class_room_id: classRoomId,
    };

    try {
      const res = await fetch("/api/accounts/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        const backendErrors: { [key: string]: string } = {};
        if (errorData.email) backendErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        if (errorData.first_name) backendErrors.firstName = Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name;
        if (errorData.last_name) backendErrors.lastName = Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name;
        if (errorData.password) backendErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        if (errorData.class_room_id) backendErrors.classRoomId = Array.isArray(errorData.class_room_id) ? errorData.class_room_id[0] : errorData.class_room_id;

        if (Object.keys(backendErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...backendErrors }));
          setTouched({ firstName: true, lastName: true, email: true, password: true, classRoomId: true });
        }
        throw new Error(errorData.detail || errorData.non_field_errors?.[0] || "Failed to create student account.");
      }

      setSuccessMessage("Student created successfully.");
      queryClient.invalidateQueries(["teacher", "students"]);
      // Reset form fields
      setFirstName("");
      setLastName("");
      setEmail("");
      setIndexNumber("");
      setPassword("");
      setClassRoomId("");
      setTouched({});
      setErrors({});

      // Instantly refresh recent student entries list so new student appears at top
      await fetchRecentStudents();
    } catch (err: any) {
      setApiError(err.message || "Unable to create student. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<RecentEntry>[] = [
    {
      key: "name",
      header: "Student",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "32px", height: "32px", borderRadius: "50%", 
            backgroundColor: "#EAF3FF", color: "#126BFF", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: "12px", fontWeight: "600" 
          }}>
            {item.initials}
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#0B1F3A" }}>{item.name}</div>
            {item.indexNo ? (
              <div style={{ fontSize: "12px", color: "#5D78A3" }}>Index: {item.indexNo}</div>
            ) : item.email ? (
              <div style={{ fontSize: "12px", color: "#5D78A3" }}>{item.email}</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: "className",
      header: "Class",
      render: (item) => <span style={{ color: "#5D78A3", fontWeight: 500 }}>{item.className}</span>
    },
    {
      key: "dateAdded",
      header: "Date Added",
      render: (item) => <span style={{ color: "#5D78A3", fontWeight: 500 }}>{item.dateAdded}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />
    }
  ];

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Page Header */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4ECF6",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(18,63,110,0.05)",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#EBF5FF",
            color: "#126BFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <UserPlus size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 700, color: "#0B1F3A", letterSpacing: "-0.5px" }}>
              Create Student
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#5D78A3" }}>
              Add a new student and assign their learning details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/teacher/students")}
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

      {/* 1. Full-Width Create Student Form Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "28px", width: "100%", boxSizing: "border-box" }}>
        
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0" }}>Student Information</h2>
        <p style={{ fontSize: "14px", color: "#5D78A3", margin: "0 0 24px 0" }}>Enter the student’s details below.</p>

        {apiError && (
          <div role="alert" style={{ padding: "12px 16px", borderRadius: "9px", backgroundColor: "#FFF8F9", border: "1px solid #FF4054", color: "#FF4054", fontSize: "13.5px", fontWeight: 500, marginBottom: "20px" }}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* First Name | Last Name */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                First Name <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
              </label>
              <input
                ref={firstNameRef}
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (touched.firstName) {
                    setErrors(prev => ({ ...prev, firstName: validateField("firstName", e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("firstName")}
                placeholder="e.g., Kaveesha"
                aria-required="true"
                aria-invalid={touched.firstName && !!errors.firstName}
                aria-describedby="firstName-error"
                style={getFieldStyle("firstName")}
              />
              {touched.firstName && errors.firstName && (
                <div id="firstName-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                  {errors.firstName}
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
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (touched.lastName) {
                    setErrors(prev => ({ ...prev, lastName: validateField("lastName", e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("lastName")}
                placeholder="e.g., Silva"
                aria-required="true"
                aria-invalid={touched.lastName && !!errors.lastName}
                aria-describedby="lastName-error"
                style={getFieldStyle("lastName")}
              />
              {touched.lastName && errors.lastName && (
                <div id="lastName-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                  {errors.lastName}
                </div>
              )}
            </div>
          </div>

          {/* Email | Index Number */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                Email Address <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setErrors(prev => ({ ...prev, email: validateField("email", e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("email")}
                placeholder="student@school.edu"
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
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value)}
                placeholder="e.g. NS/2026/001"
                style={getFieldStyle("indexNumber")}
              />
            </div>
          </div>

          {/* Password | Class Assignment */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                Temporary Password <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={passwordRef}
                  type="text"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setErrors(prev => ({ ...prev, password: validateField("password", e.target.value) }));
                    }
                  }}
                  onBlur={() => handleBlur("password")}
                  placeholder="Auto-generated or custom"
                  aria-required="true"
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby="password-error"
                  style={{ ...getFieldStyle("password"), paddingRight: "90px" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const gen = Math.random().toString(36).slice(-8);
                    setPassword(gen);
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
              {touched.password && errors.password ? (
                <div id="password-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                  {errors.password}
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "#5D78A3", marginTop: "5px", margin: "5px 0 0 0" }}>
                  Students will be prompted to change this on first login.
                </p>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#234A7A", marginBottom: "6px" }}>
                Class Assignment <span style={{ color: "#FF4054", marginLeft: "2px" }}>*</span>
              </label>
              {teacherClassrooms.length > 0 ? (
                <select
                  ref={classRoomIdRef}
                  value={classRoomId}
                  onChange={(e) => {
                    const val = Number(e.target.value) || "";
                    setClassRoomId(val);
                    if (touched.classRoomId) {
                      setErrors(prev => ({ ...prev, classRoomId: validateField("classRoomId", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("classRoomId")}
                  aria-required="true"
                  aria-invalid={touched.classRoomId && !!errors.classRoomId}
                  aria-describedby="classRoomId-error"
                  style={{
                    ...getFieldStyle("classRoomId"),
                    appearance: "none",
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B1F3A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    backgroundSize: "10px auto",
                    cursor: "pointer"
                  }}
                >
                  <option value="" disabled>Select a class...</option>
                  {teacherClassrooms.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: "12px", borderRadius: "9px", backgroundColor: "#FFF8F9", border: "1px solid #FF4054", color: "#FF4054", fontSize: "13px", fontWeight: 500 }}>
                  No classes are assigned to your account. Please contact the administrator.
                </div>
              )}
              {touched.classRoomId && errors.classRoomId && (
                <div id="classRoomId-error" role="alert" style={{ fontSize: "12px", fontWeight: 500, color: "#FF4054", marginTop: "5px" }}>
                  {errors.classRoomId}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px", paddingTop: "20px", borderTop: "1px solid #E4ECF6" }}>
            <button
              type="button"
              onClick={() => navigate("/teacher/students")}
              disabled={submitting}
              style={{
                height: "42px",
                padding: "0 20px",
                borderRadius: "9px",
                border: "1px solid #DCE6F3",
                backgroundColor: "#FFFFFF",
                color: "#3D5E8A",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                height: "42px",
                padding: "0 24px",
                borderRadius: "9px",
                border: "none",
                background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {submitting ? "Registering..." : "Create Student"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Full-Width Recent Student Entries Container (Positioned BELOW Create Form) */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", padding: "20px", width: "100%", boxSizing: "border-box" }}>
        <ChartCard title="Recent Student Entries" subtitle="Recently created student accounts.">
          <div style={{ margin: "0 -20px" }}>
            {loadingRecent ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
                Loading recent student entries...
              </div>
            ) : recentEntries.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#5D78A3" }}>
                <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", backgroundColor: "#F1EDFF", color: "#6C4BFF", marginBottom: "12px" }}>
                  <UserCheck size={28} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", marginBottom: "4px" }}>
                  No recent student entries yet.
                </div>
                <div style={{ fontSize: "14px", color: "#5D78A3" }}>
                  Newly created students will appear here.
                </div>
              </div>
            ) : (
              <DataTable columns={columns} data={recentEntries} keyExtractor={(s) => s.id} />
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default CreateStudent;

