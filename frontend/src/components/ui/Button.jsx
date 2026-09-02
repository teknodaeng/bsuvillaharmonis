import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
  type = "button",
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 shadow-sm hover:shadow active:scale-[0.99]",
    secondary:
      "bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-400 shadow-sm",
    outline:
      "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-primary-500",
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm",
    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:ring-gray-300",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-sm",
  };

  const sizes = {
    xs: "text-xs px-2.5 py-1.5 gap-1",
    sm: "text-xs px-3 py-2 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-5 py-3 gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
