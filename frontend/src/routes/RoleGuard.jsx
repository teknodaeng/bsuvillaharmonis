import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { role } = useAuthStore();
  const location = useLocation();

  if (!allowedRoles.includes(role)) {
    if (role === "ADMIN" && location.pathname === "/changelog") {
      return <Navigate to="/admin/changelog" replace />;
    }
    return <Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return children;
};
