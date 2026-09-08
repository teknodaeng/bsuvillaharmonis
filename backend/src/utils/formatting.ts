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
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(d.getTime())) return typeof dt === 'string' ? dt : '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return '-';
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  if (isNaN(d.getTime())) return typeof dt === 'string' ? dt : '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
