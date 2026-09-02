import React from "react";
import { CheckCircle2, AlertCircle, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { useUIStore } from "../../stores/uiStore";

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error" || toast.type === "danger";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0",
              isSuccess && "bg-emerald-50/95 border-emerald-200 text-emerald-900",
              isError && "bg-red-50/95 border-red-200 text-red-900",
              isWarning && "bg-amber-50/95 border-amber-200 text-amber-900",
              !isSuccess && !isError && !isWarning && "bg-white/95 border-gray-200 text-gray-900"
            )}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {isError && <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {isWarning && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

            <div className="flex-1">
              {toast.title && <h5 className="text-xs font-bold">{toast.title}</h5>}
              <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
