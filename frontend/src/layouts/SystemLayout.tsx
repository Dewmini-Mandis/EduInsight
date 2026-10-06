import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "../styles/teacher.css"; // Reuse teacher styles for now

import SystemSidebar from "../components/SystemSidebar";
import PageHeader from "../components/PageHeader";
import SystemAdminDashboard from "../dashboards/system/SystemAdminDashboard";
import ManageCurriculum from "../dashboards/system/ManageCurriculum";
import AdminSchools from "../dashboards/system/AdminSchools";
import AdminTeachers from "../dashboards/system/AdminTeachers";
import SystemAdminReportsPage from "../dashboards/system/reports/SystemAdminReportsPage";

// Reused Lesson Management Components
import LessonList from "../dashboards/teacher/LessonList";
import CreateLesson from "../dashboards/teacher/CreateLesson";
import TopicSkillManager from "../dashboards/teacher/TopicSkillManager";
import LessonBuilder from "../dashboards/teacher/LessonBuilder";

import CreateTeacherPage from "../pages/admin/CreateTeacherPage";
import EditTeacherPage from "../pages/admin/EditTeacherPage";

import StudentsPage from "../pages/admin/StudentsPage";
import CreateStudentPage from "../pages/admin/CreateStudentPage";
import EditStudentPage from "../pages/admin/EditStudentPage";
import SystemAdminProfilePage from "../pages/admin/SystemAdminProfilePage";

const SystemLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/classrooms")) return "Manage Classrooms";
    if (path.includes("/teachers")) return "Manage Teachers";
    if (path.includes("/students")) return "Student Directory";
    if (path.includes("/curriculum")) return "Manage Curriculum";
    if (path.includes("/lessons")) return "Manage Lessons";
    if (path.includes("/reports")) return "Reports";
    if (path.includes("/profile")) return "Admin Profile";
    return "EduInsight System Admin";
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Monitor users, classes, lessons, and overall system activity.";
    if (path.includes("/classrooms")) return "Manage all classrooms across the system.";
    if (path.includes("/teachers")) return "Manage teacher accounts and access.";
    if (path.includes("/students")) return "View enrolled students and profiles.";
    if (path.includes("/curriculum")) return "Configure Academic Terms, Lessons, and Skills.";
    if (path.includes("/lessons")) return "Create and configure syllabus lessons and skills.";
    if (path.includes("/reports")) return "View structured summaries of users and academic administration data.";
    if (path.includes("/profile")) return "Manage your account information and security settings.";
    return "";
  };

  return (
    <div className={`teacher-app-container ${collapsed ? "teacher-sidebar-collapsed" : ""}`}>
      <SystemSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className="teacher-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: collapsed ? "80px" : "280px", transition: "margin-left 0.3s ease" }}>
        {!location.pathname.startsWith("/system-admin/lessons") && !location.pathname.startsWith("/system-admin/reports") && !location.pathname.startsWith("/system-admin/dashboard") && !location.pathname.startsWith("/system-admin/teachers") && !location.pathname.startsWith("/system-admin/students") && !location.pathname.startsWith("/system-admin/profile") && (
          <PageHeader title={getPageTitle()} subtitle={getPageSubtitle()} />
        )}

        <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
          <Routes>
            <Route path="dashboard" element={<SystemAdminDashboard />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="teachers/create" element={<CreateTeacherPage />} />
            <Route path="teachers/edit/:id" element={<EditTeacherPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/create" element={<CreateStudentPage />} />
            <Route path="students/edit/:id" element={<EditStudentPage />} />
            <Route path="schools" element={<AdminSchools />} />
            <Route path="curriculum" element={<ManageCurriculum />} />
            <Route path="reports" element={<SystemAdminReportsPage />} />
            <Route path="profile" element={<SystemAdminProfilePage />} />
            
            {/* System Admin Lessons Management Routes */}
            <Route path="lessons" element={<LessonList />} />
            <Route path="lessons/create" element={<CreateLesson />} />
            <Route path="lessons/:lessonId/skills" element={<TopicSkillManager />} />
            <Route path="lessons/:lessonId/topics" element={<TopicSkillManager />} />
            <Route path="lessons/:lessonId/builder" element={<LessonBuilder />} />

            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default SystemLayout;
