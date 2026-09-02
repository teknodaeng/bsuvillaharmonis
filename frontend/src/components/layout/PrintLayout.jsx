import React from "react";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "../ui/Toast";

export const PrintLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100/60 py-6 sm:py-10 px-4 print:bg-white print:p-0 print:m-0">
      <ToastContainer />
      <div className="max-w-xl mx-auto print:max-w-none print:w-full">
        <Outlet />
      </div>
    </div>
  );
};
