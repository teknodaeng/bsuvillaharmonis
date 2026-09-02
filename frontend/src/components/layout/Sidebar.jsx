import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  ShieldCheck,
  Tags,
  DollarSign,
  FileText,
  LogOut,
  Recycle,
  X,
} from "lucide-react";
import clsx from "clsx";
import { APP_NAME, APP_TAGLINE } from "../../constants/app";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";

export const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Data Nasabah", to: "/admin/nasabah", icon: Users },
    { label: "Pencatatan Transaksi", to: "/admin/transaksi", icon: ArrowLeftRight },
    {
      group: "Master Data",
      items: [
        { label: "Manajemen Users / Nasabah", to: "/admin/master/users", icon: ShieldCheck },
        { label: "Kategori Sampah", to: "/admin/master/kategori", icon: Tags },
        { label: "Harga Sampah", to: "/admin/master/harga-sampah", icon: DollarSign },
      ],
    },
    { label: "Laporan PDF & Excel", to: "/admin/laporan", icon: FileText },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={clsx(
          "fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-primary-900/40">
              <Recycle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">{APP_NAME}</h2>
              <p className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">
                Panel Admin
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item, idx) => {
            if (item.group) {
              return (
                <div key={idx} className="pt-4 pb-1">
                  <span className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {item.group}
                  </span>
                  <div className="mt-1 space-y-1">
                    {item.items.map((sub, sIdx) => {
                      const SubIcon = sub.icon;
                      return (
                        <NavLink
                          key={sIdx}
                          to={sub.to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            clsx(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                              isActive
                                ? "bg-primary-600 text-white shadow-sm font-semibold"
                                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            )
                          }
                        >
                          <SubIcon className="w-4 h-4 shrink-0" />
                          <span>{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={idx}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.username?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.username || "Admin"}</p>
                <p className="text-[10px] text-slate-400">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
