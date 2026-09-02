import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

// Layouts
import { PublicLayout } from "../components/layout/PublicLayout";
import { AdminLayout } from "../components/layout/AdminLayout";
import { NasabahLayout } from "../components/layout/NasabahLayout";
import { PrintLayout } from "../components/layout/PrintLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";

// Features
import { LoginPage } from "../features/auth/LoginPage";
import { RegistrationPage } from "../features/registration/RegistrationPage";
import { NasabahDashboardPage } from "../features/dashboard/NasabahDashboardPage";
import { AdminDashboardPage } from "../features/dashboard/AdminDashboardPage";
import { NasabahListPage } from "../features/nasabah/NasabahListPage";
import { NasabahCreatePage } from "../features/nasabah/NasabahCreatePage";
import { NasabahDetailPage } from "../features/nasabah/NasabahDetailPage";
import { CategoryListPage } from "../features/categories/CategoryListPage";
import { PriceListPage } from "../features/prices/PriceListPage";
import { NasabahPriceListPage } from "../features/prices/NasabahPriceListPage";
import { UserManagementPage } from "../features/users/UserManagementPage";
import { TransactionListPage } from "../features/transactions/TransactionListPage";
import { TransactionCreatePage } from "../features/transactions/TransactionCreatePage";
import { TransactionDetailPage } from "../features/transactions/TransactionDetailPage";
import { NasabahTransactionHistoryPage } from "../features/transactions/NasabahTransactionHistoryPage";
import { ReceiptPage } from "../features/receipts/ReceiptPage";
import { ReportListPage } from "../features/reports/ReportListPage";
import { ProfilePage } from "../features/profile/ProfilePage";

const RootRedirect = () => {
  const { isAuthenticated, role } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrasi" element={<RegistrationPage />} />
      </Route>

      {/* Nasabah Portal Routes */}
      <Route
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["NASABAH"]}>
              <NasabahLayout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<NasabahDashboardPage />} />
        <Route path="/riwayat" element={<NasabahTransactionHistoryPage />} />
        <Route path="/harga-sampah" element={<NasabahPriceListPage />} />
        <Route path="/profil" element={<ProfilePage />} />
      </Route>

      {/* Admin Portal Routes */}
      <Route
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/nasabah" element={<NasabahListPage />} />
        <Route path="/admin/nasabah/new" element={<NasabahCreatePage />} />
        <Route path="/admin/nasabah/:nasabahId" element={<NasabahDetailPage />} />
        <Route path="/admin/transaksi" element={<TransactionListPage />} />
        <Route path="/admin/transaksi/new" element={<TransactionCreatePage />} />
        <Route path="/admin/transaksi/:transactionId" element={<TransactionDetailPage />} />
        <Route path="/admin/master/users" element={<UserManagementPage />} />
        <Route path="/admin/master/kategori" element={<CategoryListPage />} />
        <Route path="/admin/master/harga-sampah" element={<PriceListPage />} />
        <Route path="/admin/laporan" element={<ReportListPage />} />
      </Route>

      {/* Print Receipts (Accessible by both roles with printable layout) */}
      <Route
        element={
          <ProtectedRoute>
            <PrintLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/riwayat/:transactionId/bukti" element={<ReceiptPage />} />
        <Route path="/admin/transaksi/:transactionId/bukti" element={<ReceiptPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
