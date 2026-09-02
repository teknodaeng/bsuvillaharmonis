import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, History, DollarSign, User, LogOut, Recycle } from "lucide-react";
import clsx from "clsx";
import { APP_NAME } from "../../constants/app";
import { useAuthStore } from "../../stores/authStore";
import { ToastContainer } from "../ui/Toast";

export const NasabahLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Riwayat Transaksi", to: "/riwayat", icon: History },
    { label: "Harga Sampah", to: "/harga-sampah", icon: DollarSign },
    { label: "Profil Saya", to: "/profil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <ToastContainer />

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Recycle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">{APP_NAME}</h1>
              <p className="text-[10px] text-primary-600 font-semibold uppercase tracking-wider">
                Portal Nasabah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[10px]">
                {user?.nasabah?.name?.[0]?.toUpperCase() || "N"}
              </div>
              <span className="text-xs font-semibold text-gray-800">
                {user?.nasabah?.name || "Nasabah"}
              </span>
              <span className="text-[10px] text-gray-400">
                ({user?.nasabah?.customer_id})
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 py-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0",
                      isActive
                        ? "bg-primary-50 text-primary-700 font-semibold border border-primary-200/60"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200/80 py-4 text-center text-xs text-gray-400">
        <div className="max-w-6xl mx-auto px-4">
          &copy; {new Date().getFullYear()} {APP_NAME}. Tabungan Bank Sampah Lingkungan.
        </div>
      </footer>
    </div>
  );
};
