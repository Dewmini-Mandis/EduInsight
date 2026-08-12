import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "../styles/teacher.css"; // Reuse teacher styles for now

import SystemSidebar from "../components/SystemSidebar";
import PageHeader from "../components/PageHeader";
import SystemAdminDashboard from "../dashboards/system/SystemAdminDashboard";
import ManageCurriculum from "../dashboards/system/ManageCurriculum";
import AdminSchools from "../dashboards/system/AdminSchools";
import AdminTeachers from "../dashboards/system/AdminTeachers";
import AdminStudents from "../dashboards/system/AdminStudents";

const SystemLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "System Dashboard";
    if (path.includes("/classrooms")) return "Manage Classrooms";
    if (path.includes("/teachers")) return "Manage Teachers";
    if (path.includes("/students")) return "Student Directory";
    if (path.includes("/curriculum")) return "Manage Curriculum";
    return "EduInsight System Admin";
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Overview of system activity and performance.";
    if (path.includes("/classrooms")) return "Manage all classrooms across the system.";
    if (path.includes("/teachers")) return "Manage teacher accounts and access.";
    if (path.includes("/students")) return "View enrolled students and profiles.";
    if (path.includes("/curriculum")) return "Configure Academic Terms, Lessons, Topics, and Skills.";
    return "";
  };

  return (
    <div className={`teacher-app-container ${collapsed ? "teacher-sidebar-collapsed" : ""}`}>
      <SystemSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className="teacher-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: collapsed ? "80px" : "260px", transition: "margin-left 0.3s ease" }}>
        <PageHeader title={getPageTitle()} subtitle={getPageSubtitle()} />

        <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
          <Routes>
            <Route path="dashboard" element={<SystemAdminDashboard />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="schools" element={<AdminSchools />} />
            <Route path="curriculum" element={<ManageCurriculum />} />
            <Route path="curriculum" element={<ManageCurriculum />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default SystemLayout;
