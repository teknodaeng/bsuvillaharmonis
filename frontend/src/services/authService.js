import { apiClient } from "./apiClient";

export const authService = {
  register: async (payload) => {
    const res = await apiClient.post("/auth/register", payload);
    return res.data;
  },

  login: async (payload) => {
    const res = await apiClient.post("/auth/login", payload);
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // Ignore logout request failure
    }
  },

  changePassword: async (payload) => {
    const res = await apiClient.post("/auth/change-password", payload);
    return res.data;
  },
};
