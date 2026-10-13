import { apiClient } from "./apiClient";

export const withdrawalService = {
  // === Nasabah APIs ===
  getMyWithdrawalRequests: async (params = {}) => {
    const res = await apiClient.get("/me/withdrawal-requests", { params });
    return res.data.data;
  },

  getMyWithdrawalSummary: async () => {
    const res = await apiClient.get("/me/withdrawal-requests/summary");
    return res.data.data;
  },

  getMyWithdrawalDetail: async (id) => {
    const res = await apiClient.get(`/me/withdrawal-requests/${id}`);
    return res.data.data;
  },

  requestWithdrawal: async (payload) => {
    const res = await apiClient.post("/me/withdrawal-requests", payload);
    return res.data.data;
  },

  cancelWithdrawalRequest: async (id) => {
    const res = await apiClient.post(`/me/withdrawal-requests/${id}/cancel`);
    return res.data.data;
  },

  // === Admin APIs ===
  getAdminWithdrawalRequests: async (params = {}) => {
    const res = await apiClient.get("/admin/withdrawal-requests", { params });
    return res.data.data;
  },

  getAdminWithdrawalSummary: async () => {
    const res = await apiClient.get("/admin/withdrawal-requests/summary");
    return res.data.data;
  },

  getAdminWithdrawalDetail: async (id) => {
    const res = await apiClient.get(`/admin/withdrawal-requests/${id}`);
    return res.data.data;
  },

  approveWithdrawalRequest: async (id, payload = {}) => {
    const res = await apiClient.post(`/admin/withdrawal-requests/${id}/approve`, payload);
    return res.data.data;
  },

  rejectWithdrawalRequest: async (id, payload) => {
    const res = await apiClient.post(`/admin/withdrawal-requests/${id}/reject`, payload);
    return res.data.data;
  },
};
