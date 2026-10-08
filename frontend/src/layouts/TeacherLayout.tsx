import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import "../styles/teacher.css";

// Shared Components
import TeacherSidebar from "../components/TeacherSidebar";
import PageHeader from "../components/PageHeader";
import { CardSkeleton } from "../components/common/Skeletons";

// Lazy-loaded teacher page components
const TeacherDashboard = lazy(() => import("../dashboards/teacher/TeacherDashboard"));
const ClassAnalytics = lazy(() => import("../dashboards/teacher/ClassAnalytics"));
const RiskAlerts = lazy(() => import("../dashboards/teacher/RiskAlerts"));
const QuizList = lazy(() => import("../dashboards/teacher/QuizList"));
const CreateQuiz = lazy(() => import("../dashboards/teacher/CreateQuiz"));
const QuizDetails = lazy(() => import("../dashboards/teacher/QuizDetails"));
const EditQuiz = lazy(() => import("../dashboards/teacher/EditQuiz"));
const TeacherQuizPreview = lazy(() => import("../dashboards/teacher/TeacherQuizPreview"));
const QuizResults = lazy(() => import("../dashboards/teacher/QuizResults"));
const LessonList = lazy(() => import("../dashboards/teacher/LessonList"));
const CreateLesson = lazy(() => import("../dashboards/teacher/CreateLesson"));
const StudentList = lazy(() => import("../dashboards/teacher/StudentList"));
const CreateStudent = lazy(() => import("../dashboards/teacher/CreateStudent"));
const StudentDetails = lazy(() => import("../dashboards/teacher/StudentDetails"));
const EditStudentProfile = lazy(() => import("../dashboards/teacher/EditStudentProfile"));
const StudentProgress = lazy(() => import("../dashboards/teacher/StudentProgress"));
const MaterialList = lazy(() => import("../dashboards/teacher/MaterialList"));
const CreateVideoMaterial = lazy(() => import("../dashboards/teacher/CreateVideoMaterial"));
const CreateNoteMaterial = lazy(() => import("../dashboards/teacher/CreateNoteMaterial"));
const PreviewMaterial = lazy(() => import("../dashboards/teacher/PreviewMaterial"));
const SkillMaterialsPreview = lazy(() => import("../dashboards/teacher/SkillMaterialsPreview"));
const LessonBuilder = lazy(() => import("../dashboards/teacher/LessonBuilder"));
const TeacherLessonSkills = lazy(() => import("../dashboards/teacher/TeacherLessonSkills"));
const TopicSkillManager = lazy(() => import("../dashboards/teacher/TopicSkillManager"));
const UserProfilePage = lazy(() => import("../pages/UserProfile"));

// Analytics Pages
const TeacherClassPerformancePage = lazy(() => import("../dashboards/teacher/analytics/TeacherClassPerformancePage"));
const TeacherStudentInsightsPage = lazy(() => import("../dashboards/teacher/analytics/TeacherStudentInsightsPage"));
const TeacherSkillLessonAnalyticsPage = lazy(() => import("../dashboards/teacher/analytics/TeacherSkillLessonAnalyticsPage"));
const TeacherRiskImprovementPage = lazy(() => import("../dashboards/teacher/analytics/TeacherRiskImprovementPage"));

// Report Pages
const TeacherStudentReportPage = lazy(() => import("../dashboards/teacher/reports/TeacherStudentReportPage"));
const TeacherClassReportPage = lazy(() => import("../dashboards/teacher/reports/TeacherClassReportPage"));

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
          <Suspense fallback={<CardSkeleton />}>
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
              <Route path="lessons/:lessonId/skills" element={<TeacherLessonSkills />} />
              <Route path="lessons/:lessonId/topics" element={<TeacherLessonSkills />} />
              <Route path="lessons/:lessonId/builder" element={<LessonBuilder />} />
              
              <Route path="students" element={<StudentList />} />
              <Route path="students/create" element={<CreateStudent />} />
              <Route path="students/:studentId" element={<StudentDetails />} />
              <Route path="students/:studentId/edit" element={<EditStudentProfile />} />
              <Route path="students/:studentId/progress" element={<StudentProgress />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default TeacherLayout;
