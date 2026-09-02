import { apiClient } from "./apiClient";

export const reportService = {
  downloadTransactionsExcel: async (params = {}) => {
    const res = await apiClient.get("/admin/reports/transactions.xlsx", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  downloadTransactionsPdf: async (params = {}) => {
    const res = await apiClient.get("/admin/reports/transactions.pdf", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  downloadCategoryRecapExcel: async (params = {}) => {
    const res = await apiClient.get("/admin/reports/category-recap.xlsx", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  downloadCategoryRecapPdf: async (params = {}) => {
    const res = await apiClient.get("/admin/reports/category-recap.pdf", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  downloadNasabahExcel: async () => {
    const res = await apiClient.get("/admin/reports/nasabah.xlsx", {
      responseType: "blob",
    });
    return res.data;
  },

  downloadNasabahPdf: async () => {
    const res = await apiClient.get("/admin/reports/nasabah.pdf", {
      responseType: "blob",
    });
    return res.data;
  },

  downloadPricesExcel: async () => {
    const res = await apiClient.get("/admin/reports/prices.xlsx", {
      responseType: "blob",
    });
    return res.data;
  },

  downloadPricesPdf: async () => {
    const res = await apiClient.get("/admin/reports/prices.pdf", {
      responseType: "blob",
    });
    return res.data;
  },
};
