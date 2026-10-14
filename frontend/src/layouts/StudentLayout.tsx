import React, { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudentSidebar from "../components/student/StudentSidebar";
import { CardSkeleton } from "../components/common/Skeletons";
import "../styles/student.css";

// Lazy-loaded Student Page Components
const LearningPathPage = lazy(() => import("../pages/student/LearningPathPage"));
const TermLessonsPage = lazy(() => import("../pages/student/TermLessonsPage"));
const LessonQuizzesPage = lazy(() => import("../pages/student/LessonQuizzesPage"));
const QuizAnsweringPage = lazy(() => import("../pages/student/QuizAnsweringPage"));
const QuizResultsPage = lazy(() => import("../pages/student/QuizResultsPage"));
const QuizReviewPage = lazy(() => import("../pages/student/QuizReviewPage"));
const StudentQuizMaterialsPage = lazy(() => import("../pages/student/StudentQuizMaterialsPage"));
const MyProgressPage = lazy(() => import("../pages/student/MyProgressPage"));
const MyPerformancePage = lazy(() => import("../pages/student/MyPerformancePage"));
const MySkillsPage = lazy(() => import("../pages/student/MySkillsPage"));
const QuizHistoryPage = lazy(() => import("../pages/student/QuizHistoryPage"));
const QuizAttemptDetailsPage = lazy(() => import("../pages/student/QuizAttemptDetailsPage"));
const LearningImprovementPage = lazy(() => import("../pages/student/LearningImprovementPage"));
const StudentLessonViewer = lazy(() => import("../dashboards/student/StudentLessonViewer"));
const PreviewMaterial = lazy(() => import("../dashboards/teacher/PreviewMaterial"));

const StudentLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const location = useLocation();

  // Check if current route is a full-page view without sidebar
  const isFullPageNoSidebar =
    location.pathname.includes("/quizzes/") &&
    (location.pathname.includes("/attempt") ||
      location.pathname.includes("/results/") ||
      location.pathname.includes("/review") ||
      location.pathname.includes("/materials"));

  return (
    <div className={`student-app-container ${collapsed ? "student-sidebar-collapsed" : ""}`}>
      {/* Suppress sidebar on Quiz Answering, Quiz Results, and Review Answers full pages */}
      {!isFullPageNoSidebar && (
        <StudentSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      <main
        className="student-main-content"
        style={{
          marginLeft: isFullPageNoSidebar ? 0 : undefined,
          padding: isFullPageNoSidebar ? "24px 0" : undefined,
        }}
      >
        <Suspense fallback={<CardSkeleton />}>
          <Routes>
            <Route index element={<Navigate to="my-learning" replace />} />
            <Route path="my-learning" element={<LearningPathPage />} />
            <Route path="my-learning/term/:termName/lessons" element={<TermLessonsPage />} />
            <Route path="my-learning/term/:termName/lessons/:lessonId" element={<LessonQuizzesPage />} />

            {/* Legacy route redirects for backward compatibility */}
            <Route path="learning-path" element={<Navigate to="/student/my-learning" replace />} />
            <Route path="learning-path/term/:termName/lessons" element={<TermLessonsPage />} />
            <Route path="learning-path/term/:termName/lessons/:lessonId" element={<LessonQuizzesPage />} />
            <Route path="dashboard" element={<Navigate to="/student/my-learning" replace />} />

            {/* MY PERFORMANCE & MY SKILLS ROUTES */}
            <Route path="performance" element={<MyPerformancePage />} />
            <Route path="skills" element={<MySkillsPage />} />
            <Route path="risk-improvement" element={<Navigate to="/student/progress" replace />} />

            {/* MY PROGRESS & LEARNING HISTORY ROUTES */}
            <Route path="progress" element={<MyProgressPage />} />
            <Route path="progress/history" element={<QuizHistoryPage />} />
            <Route path="progress/quiz/:quizId" element={<QuizAttemptDetailsPage />} />
            <Route path="progress/remediation" element={<Navigate to="/student/progress" replace />} />

            {/* FULL PAGES WITHOUT SIDEBAR */}
            <Route path="quizzes/:quizId/attempt" element={<QuizAnsweringPage />} />
            <Route path="quizzes/:quizId/results/:attemptId" element={<QuizResultsPage />} />
            <Route path="quizzes/:quizId/results/:attemptId/review" element={<QuizReviewPage />} />
            <Route path="quizzes/:quizId/materials" element={<StudentQuizMaterialsPage />} />

            {/* Default and legacy fallback routes */}
            <Route path="lessons/:lessonId" element={<StudentLessonViewer />} />
            <Route path="materials/:materialId/preview" element={<PreviewMaterial />} />
            <Route path="materials/:materialId" element={<PreviewMaterial />} />
            <Route path="*" element={<Navigate to="my-learning" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default StudentLayout;
