import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../auth/Login";
import Logout from "../auth/Logout";

const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/logout" element={<Logout />} />
  </Routes>
);

export default AuthRoutes;
