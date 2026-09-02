import React from "react";
import clsx from "clsx";

export const Badge = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const baseStyles = "inline-flex items-center font-semibold rounded-full";

  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    primary: "bg-primary-50 text-primary-700 border border-primary-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    INACTIVE: "bg-gray-100 text-gray-600 border border-gray-200",
    SETOR: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    TARIK: "bg-rose-50 text-rose-700 border border-rose-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <span className={clsx(baseStyles, selectedVariant, sizes[size], className)}>
      {children}
    </span>
  );
};
