import React, { forwardRef, useState } from "react";
import clsx from "clsx";
import { Eye, EyeOff, Lock } from "lucide-react";

export const PasswordInput = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = "",
      containerClassName = "",
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || props.name;

    return (
      <div className={clsx("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Lock className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={clsx(
              "block w-full rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 pl-9 pr-10 py-2.5",
              error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-200"
                : "border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-100",
              className
            )}
            {...props}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
