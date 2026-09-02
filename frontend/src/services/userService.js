import { apiClient } from "./apiClient";

export const userService = {
  listUsers: async (params = {}) => {
    const res = await apiClient.get("/admin/users", { params });
    return res.data.data;
  },

  getUserDetail: async (userId) => {
    const res = await apiClient.get(`/admin/users/${userId}`);
    return res.data.data;
  },

  createUser: async (payload) => {
    const res = await apiClient.post("/admin/users", payload);
    return res.data.data;
  },

  updateUser: async (userId, payload) => {
    const res = await apiClient.put(`/admin/users/${userId}`, payload);
    return res.data.data;
  },

  updateUserStatus: async (userId, status) => {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  },

  resetUserPassword: async (userId, newPassword) => {
    const res = await apiClient.post(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return res.data.data;
  },
};
