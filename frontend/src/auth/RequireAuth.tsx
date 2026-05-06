import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "./authUtils";

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
