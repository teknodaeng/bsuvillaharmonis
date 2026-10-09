import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  if (typeof dateStr === "string") {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, Y, M, D] = m;
      return `${D}/${M}/${Y}`;
    }
  }
  return dayjs(dateStr).format("DD/MM/YYYY");
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  if (typeof dateStr === "string") {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) {
      const [, Y, M, D, h, min] = m;
      return `${D}/${M}/${Y} ${h}:${min}`;
    }
  }
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
