import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUser } from "../../auth/authUtils";

// Reusable Components
import FormSection from "../../components/FormSection";
import ChartCard from "../../components/ChartCard";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";

type RecentEntry = {
  id: number;
  name: string;
  className: string;
  dateAdded: string;
  status: "Active" | "Pending";
  initials: string;
};

const CreateStudent = () => {
  const user = getUser() as any;
  const teacherClassrooms = user?.teacher_profile?.classrooms || [];
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [classRoomId, setClassRoomId] = useState<number | "">("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const navigate = useNavigate();

  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    fetchRecentStudents();
  }, []);

  const fetchRecentStudents = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/accounts/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const users = data.results || data;
        
        // Process latest students (sort by id descending or just take the end of the array if not sorted)
        const recentUsers = users.slice().reverse().slice(0, 5); // Just taking the last 5 users as "recent"
        
        const entries: RecentEntry[] = recentUsers.map((u: any) => {
          const fn = u.first_name || "";
          const ln = u.last_name || "";
          return {
            id: u.id,
            name: `${fn} ${ln}`.trim() || u.username,
            initials: `${fn.charAt(0) || ""}${ln.charAt(0) || ""}`.toUpperCase() || "ST",
            className: u.student_profile?.class_name || "N/A",
            dateAdded: "Recently", // You can format a real date if provided by backend, e.g., u.date_joined
            status: "Active" as const
          };
        });
        
        setRecentEntries(entries);
      }
    } catch (err) {
      console.error("Failed to fetch recent students", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password.trim() || classRoomId === "") {
      setError("Please fill in all required fields, including Class Assignment.");
      return;
    }

    setSubmitting(true);
    const token = getToken();

    // The backend might expect username. We generate one from email.
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
        throw new Error(errorData.detail || errorData.username?.[0] || errorData.email?.[0] || "Failed to create student account.");
      }

      alert("Student profile registered successfully.");
      navigate("/teacher/students");
    } catch (err: any) {
      setError(err.message || "Failed to register student.");
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
            backgroundColor: "var(--blue-100)", color: "var(--blue-600)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: "12px", fontWeight: "600" 
          }}>
            {item.initials}
          </div>
          <span style={{ fontWeight: "600", color: "var(--navy-950)" }}>{item.name}</span>
        </div>
      )
    },
    {
      key: "className",
      header: "Class",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.className}</span>
    },
    {
      key: "dateAdded",
      header: "Date Added",
      render: (item) => <span style={{ color: "var(--text-secondary)" }}>{item.dateAdded}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <div style={{ display: "flex", backgroundColor: "var(--surface-muted)", padding: "4px", borderRadius: "8px", gap: "4px" }}>
          <button 
            onClick={() => setActiveTab("single")}
            style={{ 
              padding: "8px 16px", borderRadius: "6px", border: "none", 
              backgroundColor: activeTab === "single" ? "var(--surface)" : "transparent",
              color: activeTab === "single" ? "var(--navy-950)" : "var(--text-secondary)",
              fontWeight: activeTab === "single" ? "600" : "500",
              boxShadow: activeTab === "single" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Single Student
          </button>
          <button 
            onClick={() => setActiveTab("bulk")}
            style={{ 
              padding: "8px 16px", borderRadius: "6px", border: "none", 
              backgroundColor: activeTab === "bulk" ? "var(--surface)" : "transparent",
              color: activeTab === "bulk" ? "var(--navy-950)" : "var(--text-secondary)",
              fontWeight: activeTab === "bulk" ? "600" : "500",
              boxShadow: activeTab === "bulk" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Bulk Import
          </button>
        </div>
      </div>

      {activeTab === "single" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Top: Form */}
          <div>
            <FormSection title="Single Student Registration">
              {error && <div style={{ backgroundColor: "rgba(245, 34, 61, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
              
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>First Name *</label>
                    <input 
                      value={firstName} 
                      onChange={(e) => { setError(""); setFirstName(e.target.value); }}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                      placeholder="e.g., Kaveesha"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Last Name *</label>
                    <input 
                      value={lastName} 
                      onChange={(e) => { setError(""); setLastName(e.target.value); }}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                      placeholder="e.g., Silva"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Email Address *</label>
                    <input 
                      type="email"
                      value={email} 
                      onChange={(e) => { setError(""); setEmail(e.target.value); }}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                      placeholder="student@school.edu"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Index Number</label>
                    <input 
                      type="text"
                      value={indexNumber} 
                      onChange={(e) => { setError(""); setIndexNumber(e.target.value); }}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                      placeholder="e.g. NS/2026/001"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Temporary Password *</label>
                    <div style={{ position: "relative" }}>
                      <input 
                        type="text"
                        value={password} 
                        onChange={(e) => { setError(""); setPassword(e.target.value); }}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)" }}
                        placeholder="Auto-generated or custom"
                        required
                      />
                      <button type="button" onClick={() => setPassword(Math.random().toString(36).slice(-8))} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--blue-600)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                        Generate
                      </button>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Students will be prompted to change this on first login.</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Class Assignment *</label>
                    <select 
                      value={classRoomId} 
                      onChange={(e) => setClassRoomId(Number(e.target.value) || "")}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", outline: "none", backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
                      required
                    >
                      <option value="" disabled>Select a class</option>
                      {teacherClassrooms.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/teacher/students")}
                    disabled={submitting}
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    {submitting ? "Registering..." : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        Register Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </FormSection>
          </div>

          {/* Right Column: Recent Entries */}
          <div>
            <ChartCard title="Recent Student Entries" subtitle="Recently registered students in your classes">
              <div style={{ margin: "0 -20px" }}>
                <DataTable columns={columns} data={recentEntries} keyExtractor={(s) => s.id} />
              </div>
            </ChartCard>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--surface)", padding: "48px", borderRadius: "12px", border: "1px dashed var(--border)", textAlign: "center" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--navy-950)", marginBottom: "8px" }}>Bulk Import Students</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Upload a CSV file containing student information to register multiple students at once.</p>
          <button style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "var(--blue-600)", color: "white", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Select CSV File</button>
        </div>
      )}
    </div>
  );
};

export default CreateStudent;
