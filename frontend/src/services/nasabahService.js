import { apiClient } from "./apiClient";

export const nasabahService = {
  listNasabah: async (params = {}) => {
    const res = await apiClient.get("/admin/nasabah", { params });
    return res.data.data;
  },

  createNasabah: async (payload) => {
    const res = await apiClient.post("/admin/nasabah", payload);
    return res.data.data;
  },

  getNasabahDetail: async (nasabahId) => {
    const res = await apiClient.get(`/admin/nasabah/${nasabahId}`);
    return res.data.data;
  },

  updateNasabah: async (nasabahId, payload) => {
    const res = await apiClient.put(`/admin/nasabah/${nasabahId}`, payload);
    return res.data.data;
  },

  updateNasabahStatus: async (nasabahId, status) => {
    const res = await apiClient.patch(`/admin/nasabah/${nasabahId}/status`, { status });
    return res.data.data;
  },

  getNasabahBalance: async (nasabahId) => {
    const res = await apiClient.get(`/admin/nasabah/${nasabahId}/balance`);
    return res.data.data;
  },

  getNasabahTransactions: async (nasabahId, params = {}) => {
    const res = await apiClient.get(`/admin/nasabah/${nasabahId}/transactions`, { params });
    return res.data.data;
  },

  // Logged-in Nasabah Portal endpoints
  getMyProfile: async () => {
    const res = await apiClient.get("/me/nasabah");
    return res.data.data;
  },

  updateMyProfile: async (payload) => {
    const res = await apiClient.put("/me/nasabah", payload);
    return res.data.data;
  },

  getMyBalance: async () => {
    const res = await apiClient.get("/me/balance");
    return res.data.data;
  },

  getMyTransactions: async (params = {}) => {
    const res = await apiClient.get("/me/transactions", { params });
    return res.data.data;
  },
};
