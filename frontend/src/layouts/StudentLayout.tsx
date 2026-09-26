import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import StudentSidebar from "../components/student/StudentSidebar";
import LearningPathPage from "../pages/student/LearningPathPage";
import TermLessonsPage from "../pages/student/TermLessonsPage";
import LessonQuizzesPage from "../pages/student/LessonQuizzesPage";
import QuizAnsweringPage from "../pages/student/QuizAnsweringPage";
import QuizResultsPage from "../pages/student/QuizResultsPage";
import StudentLessonViewer from "../dashboards/student/StudentLessonViewer";
import PreviewMaterial from "../dashboards/teacher/PreviewMaterial";
import "../styles/student.css";

const StudentLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const location = useLocation();

  // Check if current route is a full-page view without sidebar
  const isFullPageNoSidebar =
    location.pathname.includes("/quizzes/") &&
    (location.pathname.includes("/attempt") || location.pathname.includes("/results/"));

  return (
    <div className={`student-app-container ${collapsed ? "student-sidebar-collapsed" : ""}`}>
      {/* Suppress sidebar on Quiz Answering and Quiz Results full pages */}
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
          <Route path="learning-path" element={<LearningPathPage />} />
          <Route path="learning-path/term/:termName/lessons" element={<TermLessonsPage />} />
          <Route path="learning-path/term/:termName/lessons/:lessonId" element={<LessonQuizzesPage />} />

          {/* TWO SEPARATE FULL PAGES WITHOUT SIDEBAR */}
          <Route path="quizzes/:quizId/attempt" element={<QuizAnsweringPage />} />
          <Route path="quizzes/:quizId/results/:attemptId" element={<QuizResultsPage />} />

          {/* Default and legacy fallback routes */}
          <Route path="dashboard" element={<Navigate to="/student/learning-path" replace />} />
          <Route path="lessons/:lessonId" element={<StudentLessonViewer />} />
          <Route path="materials/:materialId/preview" element={<PreviewMaterial />} />
          <Route path="materials/:materialId" element={<PreviewMaterial />} />
          <Route path="*" element={<Navigate to="learning-path" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentLayout;
