import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudentSidebar from "../components/student/StudentSidebar";
import LearningPathPage from "../pages/student/LearningPathPage";
import TermLessonsPage from "../pages/student/TermLessonsPage";
import LessonQuizzesPage from "../pages/student/LessonQuizzesPage";
import QuizAnsweringPage from "../pages/student/QuizAnsweringPage";
import QuizResultsPage from "../pages/student/QuizResultsPage";
import QuizReviewPage from "../pages/student/QuizReviewPage";
import MyProgressPage from "../pages/student/MyProgressPage";
import MyPerformancePage from "../pages/student/MyPerformancePage";
import MySkillsPage from "../pages/student/MySkillsPage";
import QuizHistoryPage from "../pages/student/QuizHistoryPage";
import QuizAttemptDetailsPage from "../pages/student/QuizAttemptDetailsPage";
import LearningImprovementPage from "../pages/student/LearningImprovementPage";
import StudentLessonViewer from "../dashboards/student/StudentLessonViewer";
import PreviewMaterial from "../dashboards/teacher/PreviewMaterial";
import "../styles/student.css";

const StudentLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const location = useLocation();

  // Check if current route is a full-page view without sidebar
  const isFullPageNoSidebar =
    location.pathname.includes("/quizzes/") &&
    (location.pathname.includes("/attempt") || location.pathname.includes("/results/") || location.pathname.includes("/review"));

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

          {/* Default and legacy fallback routes */}
          <Route path="lessons/:lessonId" element={<StudentLessonViewer />} />
          <Route path="materials/:materialId/preview" element={<PreviewMaterial />} />
          <Route path="materials/:materialId" element={<PreviewMaterial />} />
          <Route path="*" element={<Navigate to="my-learning" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentLayout;
