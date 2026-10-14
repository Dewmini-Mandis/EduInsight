import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser, setUser } from "../auth/authUtils";

type UserProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: number | null;
};

const DashboardRouter = () => {
  const [user, setUserState] = useState<UserProfile | null>(() => getUser());
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const token = getToken();
    if (!token || user) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/accounts/me/", {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = (await res.json()) as UserProfile;
        setUser(data);
        setUserState(data);
      } catch {
        setUserState(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "SYSTEM_ADMIN":
      return <Navigate to="/system-admin/dashboard" replace />;
    case "TEACHER":
      return <Navigate to="/teacher/dashboard" replace />;
    case "STUDENT":
      return <Navigate to="/student/my-learning" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default DashboardRouter;
