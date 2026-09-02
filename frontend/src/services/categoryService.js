import { apiClient } from "./apiClient";

export const categoryService = {
  listCategories: async (params = {}) => {
    const res = await apiClient.get("/master/categories", { params });
    return res.data.data;
  },

  createCategory: async (payload) => {
    const res = await apiClient.post("/admin/master/categories", payload);
    return res.data.data;
  },

  updateCategory: async (categoryId, payload) => {
    const res = await apiClient.put(`/admin/master/categories/${categoryId}`, payload);
    return res.data.data;
  },

  updateStatus: async (categoryId, is_active) => {
    const res = await apiClient.patch(`/admin/master/categories/${categoryId}/status`, { is_active });
    return res.data.data;
  },

  deleteCategory: async (categoryId) => {
    const res = await apiClient.delete(`/admin/master/categories/${categoryId}`);
    return res.data.data;
  },
};
