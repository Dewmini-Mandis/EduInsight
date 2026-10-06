import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import TeacherQuizPreview from "../dashboards/teacher/TeacherQuizPreview";
import QuizResults from "../dashboards/teacher/QuizResults";
import LessonList from "../dashboards/teacher/LessonList";
import CreateLesson from "../dashboards/teacher/CreateLesson";
import StudentList from "../dashboards/teacher/StudentList";
import CreateStudent from "../dashboards/teacher/CreateStudent";
import StudentDetails from "../dashboards/teacher/StudentDetails";
import EditStudentProfile from "../dashboards/teacher/EditStudentProfile";
import StudentProgress from "../dashboards/teacher/StudentProgress";
import MaterialList from "../dashboards/teacher/MaterialList";
import CreateVideoMaterial from "../dashboards/teacher/CreateVideoMaterial";
import CreateNoteMaterial from "../dashboards/teacher/CreateNoteMaterial";
import PreviewMaterial from "../dashboards/teacher/PreviewMaterial";
import SkillMaterialsPreview from "../dashboards/teacher/SkillMaterialsPreview";
import LessonBuilder from "../dashboards/teacher/LessonBuilder";
import TopicSkillManager from "../dashboards/teacher/TopicSkillManager";
import UserProfilePage from "../pages/UserProfile";

// Analytics Pages
import TeacherClassPerformancePage from "../dashboards/teacher/analytics/TeacherClassPerformancePage";
import TeacherStudentInsightsPage from "../dashboards/teacher/analytics/TeacherStudentInsightsPage";
import TeacherSkillLessonAnalyticsPage from "../dashboards/teacher/analytics/TeacherSkillLessonAnalyticsPage";
import TeacherRiskImprovementPage from "../dashboards/teacher/analytics/TeacherRiskImprovementPage";

// Report Pages
import TeacherStudentReportPage from "../dashboards/teacher/reports/TeacherStudentReportPage";
import TeacherClassReportPage from "../dashboards/teacher/reports/TeacherClassReportPage";

const TeacherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Auto collapse sidebar on mobile or when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    if (path.includes("/lessons/") && (path.includes("/skills") || path.includes("/topics"))) return "Manage Skills";
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
    if (path.includes("/lessons")) return "Manage your lesson plans and skills.";
    if (path.includes("/students/create")) return "Register new students individually or import them in bulk to your classes.";
    if (path.includes("/students")) return "Manage your students.";
    return "";
  };

  return (
    <div className={`teacher-app-container ${collapsed ? "teacher-sidebar-collapsed" : ""}`}>
      {/* Mobile Backdrop Overlay */}
      {!collapsed && (
        <div 
          className="teacher-mobile-overlay" 
          onClick={() => setCollapsed(true)} 
        />
      )}

      {/* Sidebar Component */}
      <TeacherSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Floating Mobile Menu Button (Fixed Position, does not consume page flow height) */}
      {collapsed && (
        <button
          type="button"
          className="teacher-mobile-toggle-btn"
          onClick={() => setCollapsed(false)}
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Main Panel */}
      <main className="teacher-main-content">

        {/* Page Title Section Component */}
        {!(location.pathname.includes("/lessons/") && (location.pathname.includes("/skills") || location.pathname.includes("/topics"))) && 
         location.pathname !== "/teacher/lessons" && 
         !location.pathname.startsWith("/teacher/materials") && 
         !location.pathname.startsWith("/teacher/quizzes") && 
         !location.pathname.startsWith("/teacher/students") &&
         !location.pathname.startsWith("/teacher/analytics") &&
         !location.pathname.startsWith("/teacher/reports") &&
         location.pathname !== "/teacher/dashboard" && (
          <PageHeader 
            title={getPageTitle()} 
            subtitle={getPageSubtitle()}
          />
        )}

        {/* Nested routing outlet */}
        <div className="teacher-page-body">
          <Routes>
            <Route path="dashboard" element={<TeacherDashboard />} />
            
            {/* New Analytics subroutes */}
            <Route path="analytics/class-performance" element={<TeacherClassPerformancePage />} />
            <Route path="analytics/student-insights" element={<TeacherStudentInsightsPage />} />
            <Route path="analytics/skills-lessons" element={<TeacherSkillLessonAnalyticsPage />} />
            <Route path="analytics/risk-improvement" element={<TeacherRiskImprovementPage />} />
            <Route path="analytics" element={<Navigate to="analytics/class-performance" replace />} />
            
            {/* New Reports subroutes */}
            <Route path="reports/student" element={<TeacherStudentReportPage />} />
            <Route path="reports/class" element={<TeacherClassReportPage />} />
            <Route path="reports" element={<Navigate to="reports/class" replace />} />
            <Route path="risk-alerts" element={<RiskAlerts />} />
            
            <Route path="materials" element={<MaterialList />} />
            <Route path="materials/video/create" element={<CreateVideoMaterial />} />
            <Route path="materials/note/create" element={<CreateNoteMaterial />} />
            <Route path="materials/video/:materialId/edit" element={<CreateVideoMaterial />} />
            <Route path="materials/note/:materialId/edit" element={<CreateNoteMaterial />} />
            <Route path="materials/:materialId/preview" element={<PreviewMaterial />} />
            <Route path="materials/:lessonId/:skillId/view" element={<SkillMaterialsPreview />} />
            
            <Route path="quizzes" element={<QuizList />} />
            <Route path="quizzes/create" element={<CreateQuiz />} />
            <Route path="quizzes/:quizId" element={<QuizDetails />} />
            <Route path="quizzes/:quizId/edit" element={<EditQuiz />} />
            <Route path="quizzes/:quizId/preview" element={<TeacherQuizPreview />} />
            <Route path="quizzes/:quizId/results" element={<QuizResults />} />
            
            <Route path="lessons" element={<LessonList />} />
            <Route path="lessons/create" element={<CreateLesson />} />
            <Route path="lessons/:lessonId/skills" element={<TopicSkillManager />} />
            <Route path="lessons/:lessonId/topics" element={<TopicSkillManager />} />
            <Route path="lessons/:lessonId/builder" element={<LessonBuilder />} />
            
            <Route path="students" element={<StudentList />} />
            <Route path="students/create" element={<CreateStudent />} />
            <Route path="students/:studentId" element={<StudentDetails />} />
            <Route path="students/:studentId/edit" element={<EditStudentProfile />} />
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
