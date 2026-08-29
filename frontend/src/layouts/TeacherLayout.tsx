import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "../styles/teacher.css";

// Shared Components
import TeacherSidebar from "../components/TeacherSidebar";
import PageHeader from "../components/PageHeader";

// Lazy-loaded or separate page components imports
import TeacherDashboard from "../dashboards/teacher/TeacherDashboard";
import ClassAnalytics from "../dashboards/teacher/ClassAnalytics";
import RiskAlerts from "../dashboards/teacher/RiskAlerts";
import QuizList from "../dashboards/teacher/QuizList";
import CreateQuiz from "../dashboards/teacher/CreateQuiz";
import QuizDetails from "../dashboards/teacher/QuizDetails";
import EditQuiz from "../dashboards/teacher/EditQuiz";
import QuizResults from "../dashboards/teacher/QuizResults";
import LessonList from "../dashboards/teacher/LessonList";
import CreateLesson from "../dashboards/teacher/CreateLesson";
import StudentList from "../dashboards/teacher/StudentList";
import CreateStudent from "../dashboards/teacher/CreateStudent";
import StudentDetails from "../dashboards/teacher/StudentDetails";
import StudentProgress from "../dashboards/teacher/StudentProgress";
import MaterialList from "../dashboards/teacher/MaterialList";
import CreateVideoMaterial from "../dashboards/teacher/CreateVideoMaterial";
import CreateNoteMaterial from "../dashboards/teacher/CreateNoteMaterial";
import PreviewMaterial from "../dashboards/teacher/PreviewMaterial";
import LessonBuilder from "../dashboards/teacher/LessonBuilder";
import TopicSkillManager from "../dashboards/teacher/TopicSkillManager";
import UserProfilePage from "../pages/UserProfile";
const TeacherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/analytics")) return "Class Analytics";
    if (path.includes("/risk-alerts")) return "Risk Alerts";
    if (path.includes("/materials")) return "Materials";
    if (path.includes("/quizzes/create")) return "Create Quiz";
    if (path.includes("/quizzes/") && path.includes("/edit")) return "Edit Quiz";
    if (path.includes("/quizzes/") && path.includes("/results")) return "Quiz Results";
    if (path.includes("/quizzes/")) return "Quiz Details";
    if (path.includes("/quizzes")) return "Quizzes";
    if (path.includes("/materials/create")) return "Create Material";
    if (path.includes("/lessons/create")) return "Create Lesson";
    if (path.includes("/lessons/") && path.includes("/topics")) return "Manage Topics & Skills";
    if (path.includes("/lessons")) return "Lessons";
    if (path.includes("/students/create")) return "Add Students";
    if (path.includes("/students/") && path.includes("/progress")) return "Student Progress";
    if (path.includes("/students/")) return "Student Profile";
    if (path.includes("/students")) return "Students";
    if (path.includes("/profile")) return "Teacher Profile";
    return "EduInsight";
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Overview of your classes and student performance.";
    if (path.includes("/analytics")) return "Monitor class performance, mastery, and engagement to inform instruction.";
    if (path.includes("/risk-alerts")) return "Identify students who need intervention and monitor risk trends.";
    if (path.includes("/materials/create") || path.includes("/materials")) return "Upload learning materials for your students.";
    if (path.includes("/quizzes/create")) return "Build structured assessments and assign them to the right learners.";
    if (path.includes("/quizzes")) return "Manage and review all your quizzes.";
    if (path.includes("/lessons")) return "Manage your lesson plans, topics, and skills.";
    if (path.includes("/students/create")) return "Register new students individually or import them in bulk to your classes.";
    if (path.includes("/students")) return "Manage your students.";
    return "";
  };

  return (
    <div className={`teacher-app-container ${collapsed ? "teacher-sidebar-collapsed" : ""}`}>
      {/* Sidebar Component */}
      <TeacherSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Panel */}
      <main className="teacher-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", marginLeft: collapsed ? "80px" : "260px", transition: "margin-left 0.3s ease" }}>
        {/* Header Component */}
        <PageHeader 
          title={getPageTitle()} 
          subtitle={getPageSubtitle()}
        />

        {/* Nested routing outlet */}
        <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
          <Routes>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="analytics" element={<ClassAnalytics />} />
            <Route path="risk-alerts" element={<RiskAlerts />} />
            
            <Route path="materials" element={<MaterialList />} />
            <Route path="materials/video/create" element={<CreateVideoMaterial />} />
            <Route path="materials/note/create" element={<CreateNoteMaterial />} />
            <Route path="materials/video/:materialId/edit" element={<CreateVideoMaterial />} />
            <Route path="materials/note/:materialId/edit" element={<CreateNoteMaterial />} />
            <Route path="materials/:materialId/preview" element={<PreviewMaterial />} />
            
            <Route path="quizzes" element={<QuizList />} />
            <Route path="quizzes/create" element={<CreateQuiz />} />
            <Route path="quizzes/:quizId" element={<QuizDetails />} />
            <Route path="quizzes/:quizId/edit" element={<EditQuiz />} />
            <Route path="quizzes/:quizId/results" element={<QuizResults />} />
            
            <Route path="lessons" element={<LessonList />} />
            <Route path="lessons/create" element={<CreateLesson />} />
            <Route path="lessons/:lessonId/topics" element={<TopicSkillManager />} />
            <Route path="lessons/:lessonId/builder" element={<LessonBuilder />} />
            
            <Route path="students" element={<StudentList />} />
            <Route path="students/create" element={<CreateStudent />} />
            <Route path="students/:studentId" element={<StudentDetails />} />
            <Route path="students/:studentId/progress" element={<StudentProgress />} />
            <Route path="profile" element={<UserProfilePage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TeacherLayout;
