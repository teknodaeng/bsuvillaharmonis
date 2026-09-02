import axios from "axios";
import { API_BASE_URL } from "../constants/app";
import { useAuthStore } from "../stores/authStore";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken && !originalRequest.url.includes("/auth/login") && !originalRequest.url.includes("/auth/refresh")) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: new_refresh } = res.data.data;
          
          useAuthStore.getState().setAuth({
            user: useAuthStore.getState().user,
            access_token,
            refresh_token: new_refresh || refreshToken,
          });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else if (!originalRequest.url.includes("/auth/login")) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Terjadi kesalahan pada sistem.";

    return Promise.reject(new Error(message));
  }
);
