import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import Logout from "./auth/Logout";
import RequireAuth from "./auth/RequireAuth";
import { getToken, getUser } from "./auth/authUtils";
import DashboardRouter from "./routes/DashboardRouter";
import StudentLayout from "./layouts/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import SystemLayout from "./layouts/SystemLayout";
import "./styles/auth.css";

// Role guard component
const RequireRole: React.FC<{ children: React.ReactNode; role: string }> = ({ children, role }) => {
  const token = getToken();
  const user = getUser();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!user || user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

// Simple Unauthorized Component
const Unauthorized = () => (
  <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
    <h1 style={{ color: "#ef4444", fontSize: "2rem" }}>403 - Unauthorized Access</h1>
    <p style={{ color: "#4b5563", marginTop: "1rem" }}>You do not have permission to view this page.</p>
    <a href="/login" style={{ color: "#2563eb", textDecoration: "underline", display: "inline-block", marginTop: "1.5rem" }}>
      Back to Login
    </a>
  </div>
);

// Simple Not Found Component
const NotFound = () => (
  <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
    <h1 style={{ color: "#1f2937", fontSize: "2rem" }}>404 - Page Not Found</h1>
    <p style={{ color: "#4b5563", marginTop: "1rem" }}>The page you are looking for does not exist.</p>
    <a href="/login" style={{ color: "#2563eb", textDecoration: "underline", display: "inline-block", marginTop: "1.5rem" }}>
      Back to Login
    </a>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Legacy redirect route */}
        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <DashboardRouter />
            </RequireAuth>
          }
        />
        
        {/* Protected System Admin Layout Wrapper */}
        <Route
          path="/system-admin/*"
          element={
            <RequireRole role="SYSTEM_ADMIN">
              <SystemLayout />
            </RequireRole>
          }
        />

        {/* Protected Student Routes Wrapper */}
        <Route
          path="/student/*"
          element={
            <RequireRole role="STUDENT">
              <StudentLayout />
            </RequireRole>
          }
        />

        {/* Protected Teacher Layout Wrapper */}
        <Route
          path="/teacher/*"
          element={
            <RequireRole role="TEACHER">
              <TeacherLayout />
            </RequireRole>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
