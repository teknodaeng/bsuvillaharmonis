import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("DD/MM/YYYY");
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("DD/MM/YYYY HH:mm");
};

export const formatKg = (weightInGramOrKg, isGram = false) => {
  if (weightInGramOrKg === undefined || weightInGramOrKg === null) {
    return "0,000 kg";
  }
  const kg = isGram ? weightInGramOrKg / 1000 : Number(weightInGramOrKg);
  return `${kg.toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
