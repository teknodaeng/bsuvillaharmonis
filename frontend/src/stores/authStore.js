import { create } from "zustand";

const getInitialState = () => {
  const token = localStorage.getItem("bsu_access_token");
  const refreshToken = localStorage.getItem("bsu_refresh_token");
  const userJson = localStorage.getItem("bsu_user");
  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (e) {
      console.error(e);
    }
  }
  return {
    accessToken: token || null,
    refreshToken: refreshToken || null,
    user: user || null,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
  };
};

export const useAuthStore = create((set) => ({
  ...getInitialState(),

  setAuth: ({ user, access_token, refresh_token }) => {
    localStorage.setItem("bsu_access_token", access_token);
    if (refresh_token) {
      localStorage.setItem("bsu_refresh_token", refresh_token);
    }
    localStorage.setItem("bsu_user", JSON.stringify(user));
    set({
      user,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      isAuthenticated: true,
      role: user.role,
    });
  },

  updateUser: (user) => {
    localStorage.setItem("bsu_user", JSON.stringify(user));
    set({ user, role: user?.role || null });
  },

  logout: () => {
    localStorage.removeItem("bsu_access_token");
    localStorage.removeItem("bsu_refresh_token");
    localStorage.removeItem("bsu_user");
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      role: null,
    });
  },
}));
