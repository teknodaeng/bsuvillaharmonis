import { apiClient } from "./apiClient";

export const receiptService = {
  getAdminReceiptData: async (transactionId) => {
    const res = await apiClient.get(`/admin/transactions/${transactionId}/receipt`);
    return res.data.data;
  },

  getAdminReceiptPdf: async (transactionId) => {
    const res = await apiClient.get(`/admin/transactions/${transactionId}/receipt`, {
      params: { format: "pdf" },
      responseType: "blob",
    });
    return res.data;
  },

  getMyReceiptData: async (transactionId) => {
    const res = await apiClient.get(`/me/transactions/${transactionId}/receipt`);
    return res.data.data;
  },

  getMyReceiptPdf: async (transactionId) => {
    const res = await apiClient.get(`/me/transactions/${transactionId}/receipt`, {
      params: { format: "pdf" },
      responseType: "blob",
    });
    return res.data;
  },
};
