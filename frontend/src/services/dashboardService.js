import { apiClient } from "./apiClient";

export const dashboardService = {
  getAdminDashboard: async () => {
    const res = await apiClient.get("/admin/dashboard");
    return res.data.data;
  },

  getNasabahDashboard: async () => {
    const res = await apiClient.get("/me/dashboard");
    return res.data.data;
  },
};
