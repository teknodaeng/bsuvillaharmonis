export const formatRupiah = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "Rp 0";
  }
  const numeric = Math.round(Number(amount));
  const formatted = numeric.toLocaleString("id-ID");
  return `Rp ${formatted}`;
};
