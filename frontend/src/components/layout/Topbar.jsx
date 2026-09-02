import React from "react";
import { Menu, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useNavigate } from "react-router-dom";

export const Topbar = () => {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden sm:inline-block text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
          Sistem Operasional Bank Sampah
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200/70">
          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
            {user?.role === "ADMIN" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-primary-700" />
            ) : (
              <User className="w-3.5 h-3.5 text-primary-700" />
            )}
          </div>
          <div className="text-left leading-none pr-1">
            <span className="block text-xs font-semibold text-gray-800">
              {user?.nasabah?.name || user?.username || "Pengguna"}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {user?.role === "ADMIN" ? "Petugas Admin" : user?.nasabah?.customer_id}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
