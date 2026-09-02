import React from "react";
import clsx from "clsx";

export const Card = ({
  children,
  className = "",
  title,
  subtitle,
  action,
  headerClassName = "",
  bodyClassName = "",
  footer,
  footerClassName = "",
  ...props
}) => {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl border border-gray-200/80 shadow-sm transition-all duration-200",
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          className={clsx(
            "px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4",
            headerClassName
          )}
        >
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={clsx("p-5", bodyClassName)}>{children}</div>
      {footer && (
        <div
          className={clsx(
            "px-5 py-3 bg-gray-50/75 border-t border-gray-100 rounded-b-xl",
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
