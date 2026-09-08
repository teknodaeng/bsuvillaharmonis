/**
 * Sanitizes cell values for CSV and Excel exports to prevent Formula Injection (CSV Injection).
 * Any string value starting with '=', '+', '-', '@', '\t', or '\r' is escaped by prefixing with a single quote (').
 */
export function sanitizeExcelCell<T = any>(val: T): T {
  if (typeof val !== 'string') {
    return val;
  }

  const trimmed = val.trim();
  if (!trimmed) {
    return val;
  }

  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((p) => val.startsWith(p))) {
    return `'${val}` as unknown as T;
  }

  return val;
}

/**
 * Sanitizes an array of row values for Excel.
 */
export function sanitizeExcelRow(row: any[]): any[] {
  return row.map((cell) => sanitizeExcelCell(cell));
}
