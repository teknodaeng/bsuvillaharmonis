import React, { forwardRef } from "react";
import clsx from "clsx";

export const Checkbox = forwardRef(
  (
    {
      label,
      description,
      error,
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
        <div className="relative flex items-start gap-3">
          <div className="flex h-5 items-center">
            <input
              id={inputId}
              ref={ref}
              type="checkbox"
              className={clsx(
                "h-4 w-4 rounded border-gray-300 text-primary-600 transition duration-150 ease-in-out focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                error ? "border-red-400 text-red-600 focus:ring-red-400" : "border-gray-300",
                className
              )}
              {...props}
            />
          </div>
          <div className="text-sm leading-5 flex-1">
            {label && (
              <label
                htmlFor={inputId}
                className={clsx(
                  "font-medium cursor-pointer select-none block",
                  error ? "text-red-700" : "text-gray-800"
                )}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {description && (
              <div className="text-xs text-gray-500 mt-0.5 select-none">{description}</div>
            )}
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600 font-medium pl-7">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
