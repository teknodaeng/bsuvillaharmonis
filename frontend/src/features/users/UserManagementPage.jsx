import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { userService } from "../../services/userService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { formatRupiah } from "../../utils/currency";
import { formatDate } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // Filters & State
  const [activeRoleTab, setActiveRoleTab] = useState("ALL"); // 'ALL' | 'ADMIN' | 'NASABAH'
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "ADMIN",
    status: "ACTIVE",
  });
  const [editFormData, setEditFormData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    role: "ADMIN",
    status: "ACTIVE",
  });
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  // Query Users List
  const {
    data: usersData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-users-list", searchTerm, activeRoleTab, statusFilter, page],
    queryFn: () =>
      userService.listUsers({
        search: searchTerm || undefined,
        role: activeRoleTab === "ALL" ? undefined : activeRoleTab,
        status: statusFilter || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const usersList = usersData?.items || [];
  const pagination = usersData?.pagination || { page: 1, total_pages: 1, total_items: 0 };

  // Query All Users for Stats
  const { data: allUsersData } = useQuery({
    queryKey: ["admin-users-all-stats"],
    queryFn: () => userService.listUsers({ page_size: 1000 }),
  });

  const allItems = allUsersData?.items || [];
  const totalCount = allItems.length;
  const adminCount = allItems.filter((u) => u.role === "ADMIN").length;
  const nasabahCount = allItems.filter((u) => u.role === "NASABAH").length;
  const activeCount = allItems.filter((u) => u.status === "ACTIVE" || u.is_active).length;

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (payload) => userService.createUser(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-all-stats"] });
      addToast({
        title: "Pengguna Berhasil Ditambahkan",
        message: `Akun ${data.username} telah aktif.`,
        type: "success",
      });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err) => {
      setFormError(err.message || "Gagal menambahkan pengguna.");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => userService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-all-stats"] });
      addToast({
        title: "Data Berhasil Diperbarui",
        message: "Informasi pengguna telah diperbarui.",
        type: "success",
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      setFormError(err.message || "Gagal memperbarui pengguna.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => userService.updateUserStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-all-stats"] });
      addToast({
        title: "Status Akun Diubah",
        message: `Akun ${data.username} kini berstatus ${data.status}.`,
        type: "success",
      });
    },
    onError: (err) => {
      addToast({
        title: "Gagal Mengubah Status",
        message: err.message,
        type: "danger",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => userService.resetUserPassword(id, password),
    onSuccess: () => {
      addToast({
        title: "Password Berhasil Direset",
        message: "Kata sandi pengguna telah berhasil diperbarui.",
        type: "success",
      });
      setIsResetPasswordModalOpen(false);
      setPasswordFormData({ newPassword: "", confirmNewPassword: "" });
      setSelectedUser(null);
    },
    onError: (err) => {
      setFormError(err.message || "Gagal mereset password.");
    },
  });

  const resetCreateForm = () => {
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "ADMIN",
      status: "ACTIVE",
    });
    setFormError("");
    setShowPassword(false);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username || "",
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "ADMIN",
      status: user.status || (user.is_active ? "ACTIVE" : "INACTIVE"),
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const handleOpenResetPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordFormData({ newPassword: "", confirmNewPassword: "" });
    setFormError("");
    setShowPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.username.trim() || !formData.name.trim() || !formData.password) {
      setFormError("Username, Nama Lengkap, dan Password wajib diisi.");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError("Konfirmasi password tidak cocok.");
      return;
    }

    createUserMutation.mutate({
      username: formData.username.trim(),
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      password: formData.password,
      role: formData.role,
      status: formData.status,
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!editFormData.username.trim() || !editFormData.name.trim()) {
      setFormError("Username dan Nama Lengkap wajib diisi.");
      return;
    }

    updateUserMutation.mutate({
      id: selectedUser.id,
      payload: {
        username: editFormData.username.trim(),
        name: editFormData.name.trim(),
        email: editFormData.email.trim() || null,
        phone: editFormData.phone.trim() || null,
        role: editFormData.role,
        status: editFormData.status,
      },
    });
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!passwordFormData.newPassword) {
      setFormError("Password baru wajib diisi.");
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
      setFormError("Konfirmasi password baru tidak cocok.");
      return;
    }

    resetPasswordMutation.mutate({
      id: selectedUser.id,
      password: passwordFormData.newPassword,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Master Manajemen Users / Nasabah"
        subtitle="Kelola seluruh akun pengguna, hak akses peran (Admin/Petugas & Nasabah), status aktif, dan reset kata sandi"
        actions={
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={handleOpenCreateModal}
          >
            Tambah Petugas Admin Baru
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Total Pengguna
            </span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">
              {totalCount}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Akun terdaftar</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
              Admin & Petugas
            </span>
            <span className="text-2xl font-black text-indigo-950 mt-1 block">
              {adminCount}
            </span>
            <span className="text-[11px] text-indigo-500 mt-0.5 block">Hak Akses Admin</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Akun Nasabah
            </span>
            <span className="text-2xl font-black text-emerald-950 mt-1 block">
              {nasabahCount}
            </span>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">Nasabah Tabungan</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider block">
              Pengguna Aktif
            </span>
            <span className="text-2xl font-black text-teal-950 mt-1 block">
              {activeCount}
            </span>
            <span className="text-[11px] text-teal-600 mt-0.5 block">Dapat login & transaksi</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex rounded-xl bg-gray-200/70 p-1">
        <button
          type="button"
          onClick={() => {
            setActiveRoleTab("ALL");
            setPage(1);
          }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeRoleTab === "ALL"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Semua Pengguna ({totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRoleTab("ADMIN");
            setPage(1);
          }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeRoleTab === "ADMIN"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin / Petugas Admin ({adminCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRoleTab("NASABAH");
            setPage(1);
          }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeRoleTab === "NASABAH"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Nasabah ({nasabahCount})</span>
        </button>
      </div>

      {/* Main Table Card */}
      <Card
        title="Daftar Pengguna & Nasabah"
        subtitle={`Menampilkan ${usersList.length} dari ${pagination.total_items} akun pengguna`}
      >
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, username, email, no. HP, atau NIK nasabah..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              placeholder="-- Semua Status --"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "Semua Status", value: "" },
                { label: "Aktif (ACTIVE)", value: "ACTIVE" },
                { label: "Nonaktif (INACTIVE)", value: "INACTIVE" },
              ]}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => refetch()}
            className="shrink-0"
          >
            Segarkan
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Pengguna</th>
                <th className="py-3 px-3">Nama Lengkap & Kontak</th>
                <th className="py-3 px-3">Role / Peran</th>
                <th className="py-3 px-3">Detail Nasabah</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Terakhir Login</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    Tidak ada akun pengguna yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => {
                  const isAdmin = u.role === "ADMIN";
                  const isActive = u.status === "ACTIVE" || u.is_active;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Avatar & Username */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isAdmin
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {u.name ? u.name[0].toUpperCase() : u.username ? u.username[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-gray-900 block">
                              {u.username || "-"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ID: {u.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 text-sm">{u.name || "-"}</p>
                        <div className="space-y-0.5 mt-0.5 text-[11px] text-gray-500">
                          {u.phone && (
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{u.phone}</span>
                            </p>
                          )}
                          {u.email && (
                            <p className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="truncate max-w-[180px]">{u.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Admin / Petugas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Nasabah</span>
                          </span>
                        )}
                      </td>

                      {/* Nasabah Detail */}
                      <td className="py-3 px-3">
                        {u.nasabah ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {u.nasabah.nasabah_category || "Rumah Tangga/Individu"}
                            </span>
                            <p className="font-mono text-[11px] text-gray-600">
                              NIK: {u.nasabah.nik}
                            </p>
                            <p className="font-bold text-emerald-700 text-xs">
                              Saldo: {formatRupiah(u.nasabah.balance || 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Akun Petugas</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: u.id,
                              status: isActive ? "INACTIVE" : "ACTIVE",
                            })
                          }
                          title="Klik untuk ubah status"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            isActive
                              ? "bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100/80 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-3 text-gray-500">
                        {u.last_login_at ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{formatDate(u.last_login_at)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Belum pernah</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.nasabah_id && (
                            <Link to={`/admin/nasabah/${u.nasabah_id}`}>
                              <Button
                                variant="outline"
                                size="xs"
                                title="Buka Detail Nasabah"
                                icon={ArrowRight}
                              >
                                Detail
                              </Button>
                            </Link>
                          )}

                          <Button
                            variant="outline"
                            size="xs"
                            title="Edit Data User"
                            icon={Edit2}
                            onClick={() => handleOpenEditModal(u)}
                          >
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="xs"
                            title="Reset Password"
                            icon={KeyRound}
                            onClick={() => handleOpenResetPasswordModal(u)}
                          >
                            Reset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4 text-xs">
            <span className="text-gray-500">
              Halaman {pagination.page} dari {pagination.total_pages} (Total {pagination.total_items} data)
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.total_pages))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 1: Tambah Petugas Admin / User Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tambah Petugas Admin / Pengguna Baru"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="danger">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username Akun"
              placeholder="Contoh: petugas_kasir1"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              helperText="Digunakan untuk login ke sistem"
            />

            <Select
              label="Role / Peran"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              options={[
                { label: "Admin / Petugas Admin (ADMIN)", value: "ADMIN" },
                { label: "Nasabah (NASABAH)", value: "NASABAH" },
              ]}
            />
          </div>

          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Siti Rahmawati, S.Tr"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email (Opsional)"
              type="email"
              placeholder="petugas@bsuvillaharmonis.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="No. Telepon / WhatsApp"
              placeholder="081234567890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Kata Sandi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="block w-full rounded-lg text-sm border border-gray-300 px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Konfirmasi Kata Sandi <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Ulangi kata sandi"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="block w-full rounded-lg text-sm border border-gray-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <Select
            label="Status Akun Awal"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { label: "Aktif (Dapat langsung login)", value: "ACTIVE" },
              { label: "Nonaktif (Ditangguhkan)", value: "INACTIVE" },
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createUserMutation.isPending}
            >
              Simpan Akun Pengguna
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit User */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        title={`Edit Pengguna: ${selectedUser?.username || ""}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="danger">{formError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username Akun"
              value={editFormData.username}
              onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
              required
            />

            <Select
              label="Role / Peran"
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              required
              options={[
                { label: "Admin / Petugas Admin (ADMIN)", value: "ADMIN" },
                { label: "Nasabah (NASABAH)", value: "NASABAH" },
              ]}
            />
          </div>

          <Input
            label="Nama Lengkap"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />

            <Input
              label="No. Telepon / WhatsApp"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </div>

          <Select
            label="Status Akun"
            value={editFormData.status}
            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
            options={[
              { label: "Aktif (ACTIVE)", value: "ACTIVE" },
              { label: "Nonaktif (INACTIVE)", value: "INACTIVE" },
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateUserMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Reset Password */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        title={`Reset Password: ${selectedUser?.username || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          {formError && <Alert type="danger">{formError}</Alert>}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-bold">Perhatian:</p>
            <p className="mt-0.5">
              Anda akan mengganti kata sandi untuk akun <strong>{selectedUser?.name || selectedUser?.username}</strong>. Pengguna harus menggunakan kata sandi baru ini pada login berikutnya.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 6 karakter"
                value={passwordFormData.newPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })
                }
                required
                className="block w-full rounded-lg text-sm border border-gray-300 px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ulangi kata sandi baru"
              value={passwordFormData.confirmNewPassword}
              onChange={(e) =>
                setPasswordFormData({
                  ...passwordFormData,
                  confirmNewPassword: e.target.value,
                })
              }
              required
              className="block w-full rounded-lg text-sm border border-gray-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetPasswordModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Lock}
              isLoading={resetPasswordMutation.isPending}
            >
              Reset Kata Sandi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
