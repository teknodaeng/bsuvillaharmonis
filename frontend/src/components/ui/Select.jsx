import React, { forwardRef } from "react";
import clsx from "clsx";

export const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder = "-- Pilih --",
      className = "",
      containerClassName = "",
      required = false,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className={clsx("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              "block w-full rounded-lg text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 px-3.5 py-2.5 bg-white cursor-pointer",
              error
                ? "border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200"
                : "border border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-primary-100",
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
