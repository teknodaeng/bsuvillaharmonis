import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  className = "",
}) => {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border border-gray-200/80 rounded-xl mt-3 text-xs text-gray-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Menampilkan <span className="font-semibold text-gray-800">{startItem}</span>-
          <span className="font-semibold text-gray-800">{endItem}</span> dari{" "}
          <span className="font-semibold text-gray-800">{totalItems}</span> data
        </span>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 rounded-lg border border-gray-300 py-1 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value={10}>10 / hal</option>
            <option value={20}>20 / hal</option>
            <option value={50}>50 / hal</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 font-medium text-gray-700">
          Hal. {page} dari {totalPages || 1}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
