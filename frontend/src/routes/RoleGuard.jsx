import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { role } = useAuthStore();

  if (!allowedRoles.includes(role)) {
    return <Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return children;
};
