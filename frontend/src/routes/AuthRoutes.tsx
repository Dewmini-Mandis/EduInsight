import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../auth/Login";

const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
  </Routes>
);

export default AuthRoutes;
