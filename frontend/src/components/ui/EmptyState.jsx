import React from "react";
import { Inbox } from "lucide-react";
import clsx from "clsx";

export const EmptyState = ({
  icon: Icon = Inbox,
  title = "Belum Ada Data",
  description = "Data tidak ditemukan atau belum pernah ditambahkan.",
  action,
  className = "",
}) => {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/50",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {description && (
        <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
