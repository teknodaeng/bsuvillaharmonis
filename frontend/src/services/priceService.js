import { apiClient } from "./apiClient";

export const priceService = {
  listPrices: async (params = {}) => {
    const res = await apiClient.get("/master/waste-prices", { params });
    return res.data.data;
  },

  getActivePriceByCategory: async (categoryId) => {
    const res = await apiClient.get(`/master/categories/${categoryId}/active-price`);
    return res.data.data;
  },

  createPrice: async (payload) => {
    const res = await apiClient.post("/admin/master/waste-prices", payload);
    return res.data.data;
  },

  updatePrice: async (priceId, payload) => {
    const res = await apiClient.put(`/admin/master/waste-prices/${priceId}`, payload);
    return res.data.data;
  },

  updateStatus: async (priceId, status) => {
    const res = await apiClient.patch(`/admin/master/waste-prices/${priceId}/status`, { status });
    return res.data.data;
  },

  deletePrice: async (priceId) => {
    const res = await apiClient.delete(`/admin/master/waste-prices/${priceId}`);
    return res.data.data;
  },
};
