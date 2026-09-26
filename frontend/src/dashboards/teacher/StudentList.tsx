import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../auth/authUtils";
import { Users, UserPlus, FileText, BarChart2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import "../../styles/teacher.css";

type StudentItem = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  index_no: string;
  class_name: string;
  initials?: string;
  is_active?: boolean;
};

const StudentList = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All Classes");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const token = getToken();
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const users = Array.isArray(data) ? data : (data.results || []);
        
        const processedUsers = users.map((u: any) => {
          const fn = u.first_name || "";
          const ln = u.last_name || "";
          return {
            ...u,
            full_name: `${fn} ${ln}`.trim(),
            initials: `${fn.charAt(0) || ""}${ln.charAt(0) || ""}`.toUpperCase(),
            index_no: u.student_profile?.index_no || "N/A",
            class_name: u.student_profile?.class_room?.name || u.student_profile?.class_name || "10A",
            is_active: u.is_active !== undefined ? u.is_active : true
          };
        });
        
        setStudents(processedUsers);
      } else {
        setError("Failed to fetch students");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      (student.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (student.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (student.index_no || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesClass = filterClass === "All Classes" || (student.class_name === filterClass);
    
    let matchesStatus = true;
    if (filterStatus === "Active") matchesStatus = student.is_active === true;
    if (filterStatus === "Inactive") matchesStatus = student.is_active === false;

    return matchesSearch && matchesClass && matchesStatus;
  });

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#5D78A3", fontFamily: '"Inter", sans-serif' }}>Loading student registry...</div>;
  if (error) return <div style={{ padding: "2rem", textAlign: "center", color: "#FF4054", fontFamily: '"Inter", sans-serif' }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: '"Inter", sans-serif', maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* Header Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#F1EDFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={24} color="#6C4BFF" />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Students</h1>
            <p style={{ fontSize: "15px", color: "#5D78A3", margin: 0 }}>Manage your students and track their learning journey.</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate("/teacher/students/create")}
          style={{ height: "42px", padding: "0 20px", borderRadius: "9px", background: "linear-gradient(180deg, #169BFF 0%, #126BFF 100%)", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(18, 107, 255, 0.25)", transition: "all 0.2s" }}
        >
          <UserPlus size={18} />
          Add Student
        </button>
      </div>

      {/* Search / Filter Row */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "280px", position: "relative" }}>
          <Search size={18} color="#5D78A3" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
          <input 
            type="text" 
            placeholder="Search by name, index number, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: "44px", padding: "0 16px 0 44px", borderRadius: "10px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", fontSize: "14px", color: "#0B1F3A", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        
        <select 
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={{ width: "200px", height: "44px", padding: "0 16px", borderRadius: "10px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", fontSize: "14px", color: "#0B1F3A", outline: "none", cursor: "pointer", appearance: "none", backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B1F3A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", backgroundSize: "10px auto" }}
        >
          <option value="All Classes">All Classes</option>
          <option value="10A">10A</option>
          <option value="10B">10B</option>
        </select>
        
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: "160px", height: "44px", padding: "0 16px", borderRadius: "10px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", fontSize: "14px", color: "#0B1F3A", outline: "none", cursor: "pointer", appearance: "none", backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B1F3A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", backgroundSize: "10px auto" }}
        >
          <option value="All Status">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Registry Card */}
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4ECF6", boxShadow: "0 6px 20px rgba(18,63,110,0.05)", overflow: "hidden" }}>
        
        {/* Registry Header */}
        <div style={{ padding: "24px", borderBottom: "1px solid #E4ECF6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#EAF3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText size={20} color="#126BFF" />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0B1F3A", margin: "0 0 2px 0" }}>Student Registry</h2>
              <p style={{ fontSize: "14px", color: "#5D78A3", margin: 0 }}>View and manage all registered students.</p>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", backgroundColor: "#F5F8FC", borderRadius: "10px" }}>
            <Users size={20} color="#126BFF" />
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>{filteredStudents.length}</div>
              <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "4px" }}>Total Students</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FBFF", borderBottom: "1px solid #E4ECF6" }}>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Student</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Index Number</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Classroom</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3" }}>Status</th>
                <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, color: "#5D78A3", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: index === filteredStudents.length - 1 ? "none" : "1px solid #E4ECF6", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FBFF"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#EAF3FF", color: "#126BFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0 }}>
                        {item.initials || "ST"}
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0B1F3A", marginBottom: "2px" }}>{item.full_name}</div>
                        <div style={{ fontSize: "13px", color: "#5D78A3" }}>{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px", color: "#5D78A3" }}>
                    {item.index_no}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: "14px", color: "#5D78A3" }}>
                    {item.class_name}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    {item.is_active ? (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", backgroundColor: "#E9FBF4", color: "#16B978", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                        Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", backgroundColor: "#FFF1F3", color: "#FF4054", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => navigate(`/teacher/students/${item.id}`)}
                        style={{ padding: "0 12px", height: "32px", borderRadius: "6px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#0B1F3A", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => navigate(`/teacher/students/${item.id}/progress`)}
                        style={{ padding: "0 12px", height: "32px", borderRadius: "6px", border: "none", backgroundColor: "#F1EDFF", color: "#6C4BFF", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
                      >
                        <BarChart2 size={14} />
                        Progress
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "40px 24px", textAlign: "center", color: "#5D78A3", fontSize: "14px" }}>
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (Visual only as requested to preserve current logic/mock) */}
        {filteredStudents.length > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #E4ECF6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#5D78A3" }}>
              Showing 1–{filteredStudents.length} of {filteredStudents.length} students
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#0B1F3A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronLeft size={16} />
              </button>
              <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: "none", backgroundColor: "#126BFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                1
              </button>
              <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid #DCE6F3", backgroundColor: "#FFFFFF", color: "#0B1F3A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentList;

