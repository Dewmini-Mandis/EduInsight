import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import Logout from "./auth/Logout";
import RequireAuth from "./auth/RequireAuth";
import DashboardRouter from "./routes/DashboardRouter";
import UserProfilePage from "./pages/UserProfile";
// import Register from "./auth/Register";
import "./styles/auth.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <DashboardRouter />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <RequireAuth>
              <UserProfilePage />
            </RequireAuth>
          }
        />
        {/* <Route path="/register" element={<Register />} /> */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
