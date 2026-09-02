import React, { forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      className = "",
      containerClassName = "",
      required = false,
      id,
      ...props
    },
    ref
  ) => {
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
          {Icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              "block w-full rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500",
              Icon ? "pl-9" : "pl-3.5",
              "pr-3.5 py-2.5",
              error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-200"
                : "border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-100",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
