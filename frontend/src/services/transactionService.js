import { apiClient } from "./apiClient";

export const transactionService = {
  listTransactions: async (params = {}) => {
    const res = await apiClient.get("/admin/transactions", { params });
    return res.data.data;
  },

  createTransaction: async (payload) => {
    const res = await apiClient.post("/admin/transactions", payload);
    return res.data.data;
  },

  getTransactionDetail: async (transactionId) => {
    const res = await apiClient.get(`/admin/transactions/${transactionId}`);
    return res.data.data;
  },

  getTransactionReceipt: async (transactionId) => {
    const res = await apiClient.get(`/admin/transactions/${transactionId}/receipt`);
    return res.data.data;
  },
};
