import React from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

export const Alert = ({
  type = "info",
  title,
  children,
  className = "",
  onClose,
}) => {
  const styles = {
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: Info,
      iconColor: "text-blue-500",
    },
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      icon: AlertCircle,
      iconColor: "text-amber-500",
    },
    danger: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: XCircle,
      iconColor: "text-red-500",
    },
  };

  const current = styles[type] || styles.info;
  const Icon = current.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-4 rounded-xl border text-sm transition-all",
        current.bg,
        className
      )}
    >
      <Icon className={clsx("w-5 h-5 shrink-0 mt-0.5", current.iconColor)} />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-95">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          &times;
        </button>
      )}
    </div>
  );
};
