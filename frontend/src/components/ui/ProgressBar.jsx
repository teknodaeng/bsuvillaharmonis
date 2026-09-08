import React from "react";
import clsx from "clsx";

/**
 * Modern Progress Bar component.
 * Supports determinate (0-100%) and indeterminate loading animation.
 * Can be fixed to the top of the viewport (like NProgress) or embedded inside a container/card.
 */
export const ProgressBar = ({
  progress = 0,
  indeterminate = false,
  fixedTop = false,
  height = "h-1",
  color = "from-emerald-500 via-primary-500 to-teal-400",
  className = "",
  showGlow = true,
  ...props
}) => {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(progress)}
      className={clsx(
        "overflow-hidden bg-emerald-100/50 transition-opacity duration-300",
        fixedTop && "fixed top-0 left-0 right-0 z-50",
        height,
        className
      )}
      {...props}
    >
      {indeterminate ? (
        <div
          className={clsx(
            "h-full w-full bg-gradient-to-r",
            color,
            "animate-progress-indeterminate"
          )}
          style={{
            boxShadow: showGlow ? "0 0 10px rgba(16, 185, 129, 0.7)" : undefined,
          }}
        />
      ) : (
        <div
          className={clsx(
            "h-full bg-gradient-to-r transition-all duration-300 ease-out",
            color
          )}
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            boxShadow: showGlow ? "0 0 10px rgba(16, 185, 129, 0.7)" : undefined,
          }}
        />
      )}
    </div>
  );
};
