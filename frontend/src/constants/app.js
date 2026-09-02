export const APP_NAME = import.meta.env.VITE_APP_NAME || "BSU Villa Harmonis";
export const APP_SHORT_NAME = import.meta.env.VITE_APP_SHORT_NAME || "BSU";
export const APP_TAGLINE = "Tabungan Bank Sampah Lingkungan";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/v1";

export const ROLES = {
  ADMIN: "ADMIN",
  NASABAH: "NASABAH",
};

export const TRANSACTION_TYPES = {
  SETOR: "SETOR",
  TARIK: "TARIK",
};

export const STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};
