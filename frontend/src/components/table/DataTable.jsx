import React from "react";
import clsx from "clsx";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = "Belum ada data yang tersedia.",
  keyField = "id",
  onRowClick,
  className = "",
}) => {
  return (
    <div className={clsx("w-full overflow-hidden rounded-xl border border-gray-200/80 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={clsx(
                    "px-4 py-3.5 whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner size="md" />
                    <span className="text-xs text-gray-400 font-medium">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  <EmptyState title="Tidak Ada Data" description={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={clsx(
                    "transition-colors duration-150 hover:bg-gray-50/70",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={clsx(
                        "px-4 py-3.5 text-xs text-gray-700",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
