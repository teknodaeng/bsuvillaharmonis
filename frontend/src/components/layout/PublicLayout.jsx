import React from "react";
import { Outlet } from "react-router-dom";
import { APP_NAME, APP_TAGLINE } from "../../constants/app";
import { ToastContainer } from "../ui/Toast";

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <ToastContainer />
      
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto text-center pt-4 sm:pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-3 drop-shadow-sm">
          <img src="/logo.png" alt={APP_NAME} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
          {APP_TAGLINE}
        </p>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto my-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center pb-4">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {APP_NAME}. Bersama menjaga kebersihan lingkungan.
        </p>
      </footer>
    </div>
  );
};
