export function formatKg(
  weightGramOrKg: number | null | undefined,
  fromGram: boolean = true
): string {
  if (weightGramOrKg === null || weightGramOrKg === undefined) {
    return '0,000 kg';
  }
  const kg = fromGram ? Number(weightGramOrKg) / 1000.0 : Number(weightGramOrKg);
  // Format with 3 decimals, using comma as decimal separator and dot as thousand separator
  const parts = kg.toFixed(3).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `${integerPart},${decimalPart} kg`;
}

export function formatDate(dt: string | Date | null | undefined): string {
  if (!dt) return '-';
  if (typeof dt === 'string') {
    const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, Y, M, D] = m;
      return `${D}/${M}/${Y}`;
    }
  }
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(d.getTime())) return typeof dt === 'string' ? dt : '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return '-';
  if (typeof dt === 'string') {
    const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) {
      const [, Y, M, D, h, min] = m;
      return `${D}/${M}/${Y} ${h}:${min}`;
    }
  }
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(d.getTime())) return typeof dt === 'string' ? dt : '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatToLocalSqlDateTime(dt?: Date | string | null): string {
  if (!dt) {
    const now = new Date();
    const Y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const D = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  if (typeof dt === 'string') {
    const trimmed = dt.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
    if (match) {
      const datePart = match[1];
      const timePart = match[2];
      const secPart = match[3] || '00';
      return `${datePart} ${timePart}:${secPart}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const Y = parsed.getFullYear();
      const M = String(parsed.getMonth() + 1).padStart(2, '0');
      const D = String(parsed.getDate()).padStart(2, '0');
      const h = String(parsed.getHours()).padStart(2, '0');
      const m = String(parsed.getMinutes()).padStart(2, '0');
      const s = String(parsed.getSeconds()).padStart(2, '0');
      return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    }
    return trimmed;
  }

  const Y = dt.getFullYear();
  const M = String(dt.getMonth() + 1).padStart(2, '0');
  const D = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  const s = String(dt.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}
