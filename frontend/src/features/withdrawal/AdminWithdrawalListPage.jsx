import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HandCoins,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  Eye,
  AlertCircle,
  Building2,
  Banknote,
  CreditCard,
  Printer,
  Calendar,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { withdrawalService } from "../../services/withdrawalService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { DataTable } from "../../components/table/DataTable";
import { Pagination } from "../../components/table/Pagination";
import { formatRupiah } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

const QUICK_REJECTION_REASONS = [
  "Nomor rekening atau nama pemilik rekening tidak valid / tidak ditemukan.",
  "Kas penarikan tunai sedang tidak mencukupi hari ini. Silakan pilih transfer atau ajukan lain waktu.",
  "Data rekening tidak sesuai dengan identitas nasabah terdaftar.",
  "Silakan hubungi atau konfirmasi langsung ke kantor Bank Sampah Villa Harmonis.",
];

export const AdminWithdrawalListPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // Filters State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal States
  const [approveModalItem, setApproveModalItem] = useState(null);
  const [approveNotes, setApproveNotes] = useState("");

  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const [detailModalItem, setDetailModalItem] = useState(null);

  // Queries
  const { data: summaryData } = useQuery({
    queryKey: ["admin-withdrawal-summary"],
    queryFn: () => withdrawalService.getAdminWithdrawalSummary(),
  });

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: [
      "admin-withdrawal-requests",
      {
        status: statusFilter,
        search,
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: pageSize,
      },
    ],
    queryFn: () =>
      withdrawalService.getAdminWithdrawalRequests({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: pageSize,
      }),
  });

  // Mutation Approve
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) =>
      withdrawalService.approveWithdrawalRequest(id, { notes: notes.trim() || null }),
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Permohonan Disetujui",
        message: `Permohonan ${data.request_no} berhasil disetujui. Saldo nasabah telah dipotong dan transaksi TARIK ${data.transaction_no || ""} berhasil dicatat.`,
      });
      setApproveModalItem(null);
      setApproveNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => {
      addToast({
        type: "error",
        title: "Persetujuan Gagal",
        message: err.response?.data?.message || err.message || "Gagal menyetujui permohonan penarikan.",
      });
    },
  });

  // Mutation Reject
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      withdrawalService.rejectWithdrawalRequest(id, { rejection_reason: reason.trim() }),
    onSuccess: (data) => {
      addToast({
        type: "info",
        title: "Permohonan Ditolak",
        message: `Permohonan ${data.request_no} telah ditolak. Saldo nasabah tetap aman.`,
      });
      setRejectModalItem(null);
      setRejectionReason("");
      setRejectError("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => {
      addToast({
        type: "error",
        title: "Penolakan Gagal",
        message: err.response?.data?.message || err.message || "Gagal menolak permohonan penarikan.",
      });
    },
  });

  const handleOpenApprove = (item) => {
    setApproveModalItem(item);
    setApproveNotes("");
  };

  const handleOpenReject = (item) => {
    setRejectModalItem(item);
    setRejectionReason("");
    setRejectError("");
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setRejectError("Alasan penolakan wajib diisi minimal 3 karakter.");
      return;
    }
    setRejectError("");
    rejectMutation.mutate({ id: rejectModalItem.id, reason: rejectionReason });
  };

  const columns = [
    {
      title: "No. Permohonan",
      key: "request_no",
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-gray-900 text-xs">{val}</span>
          <span className="block text-[11px] text-gray-400">
            {formatDateTime(row.created_at)}
          </span>
        </div>
      ),
    },
    {
      title: "Nasabah",
      key: "nasabah_name",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-900 text-xs">{row.nasabah_name}</span>
            <span className="text-[10px] text-gray-400 font-mono">
              ({row.nasabah_customer_id})
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">
            Rek: {row.nasabah_account_no}
          </span>
        </div>
      ),
    },
    {
      title: "Nominal",
      key: "amount",
      align: "right",
      render: (val) => (
        <span className="font-bold text-rose-600 text-sm">
          {formatRupiah(val)}
        </span>
      ),
    },
    {
      title: "Metode & Tujuan",
      key: "method",
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            {val === "TUNAI" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Banknote className="w-3 h-3" /> Kas Tunai BSU
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                <Building2 className="w-3 h-3" /> {row.bank_name}
              </span>
            )}
          </div>
          {val === "TRANSFER" && (
            <p className="text-[11px] text-gray-600 mt-0.5 font-mono truncate max-w-[200px]" title={`${row.account_number} a.n ${row.account_holder}`}>
              {row.account_number} a.n {row.account_holder}
            </p>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (val) => {
        let label = val;
        let icon = null;
        if (val === "PENDING") {
          label = "Menunggu Persetujuan";
          icon = <Clock className="w-3 h-3 mr-1 inline" />;
        } else if (val === "APPROVED") {
          label = "Disetujui";
          icon = <CheckCircle2 className="w-3 h-3 mr-1 inline" />;
        } else if (val === "REJECTED") {
          label = "Ditolak";
          icon = <XCircle className="w-3 h-3 mr-1 inline" />;
        } else if (val === "CANCELLED") {
          label = "Dibatalkan";
          icon = <X className="w-3 h-3 mr-1 inline" />;
        }
        return (
          <Badge variant={val}>
            {icon}
            {label}
          </Badge>
        );
      },
    },
    {
      title: "Audit / Keterangan",
      key: "notes",
      render: (_, row) => {
        if (row.status === "APPROVED") {
          return (
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-700 block">
                Disetujui: {row.approver_name || "Admin"}
              </span>
              {row.transaction_no && (
                <span className="text-[11px] font-mono text-gray-500 block">
                  Trx: {row.transaction_no}
                </span>
              )}
            </div>
          );
        }
        if (row.status === "REJECTED") {
          return (
            <div className="text-xs text-rose-600 bg-rose-50/70 p-1 rounded max-w-xs border border-rose-100">
              <span className="font-semibold block text-[10px] text-rose-700">
                Ditolak: {row.rejector_name || "Admin"}
              </span>
              <span className="text-[11px] truncate block" title={row.rejection_reason}>
                "{row.rejection_reason}"
              </span>
            </div>
          );
        }
        return (
          <span className="text-xs text-gray-500 italic max-w-xs truncate block">
            {row.notes ? `"${row.notes}"` : "-"}
          </span>
        );
      },
    },
    {
      title: "Aksi",
      key: "id",
      align: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          {row.status === "PENDING" ? (
            <>
              <Button
                variant="primary"
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={Check}
                onClick={() => handleOpenApprove(row)}
                title="Setujui & Cairkan Saldo"
              >
                Setujui
              </Button>
              <Button
                variant="danger"
                size="xs"
                icon={X}
                onClick={() => handleOpenReject(row)}
                title="Tolak Permohonan"
              >
                Tolak
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="xs"
              icon={Eye}
              onClick={() => setDetailModalItem(row)}
              title="Lihat Rincian"
            >
              Detail
            </Button>
          )}

          {row.status === "APPROVED" && row.transaction_id && (
            <Link to={`/admin/transaksi/${row.transaction_id}/bukti`}>
              <Button variant="outline" size="xs" icon={Printer} title="Bukti Transaksi">
                Bukti
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permohonan Penarikan Saldo"
        subtitle="Kelola, verifikasi, setujui, atau tolak permohonan pencairan tabungan yang diajukan oleh nasabah"
      />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <Card className="border-amber-200/90 bg-gradient-to-br from-white to-amber-50/50 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Menunggu Persetujuan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-800">
                {summaryData?.pending_count || 0}
              </span>
              <span className="text-xs font-semibold text-amber-600">permohonan</span>
            </div>
            <p className="text-xs font-bold text-amber-700 mt-1">
              {summaryData?.pending_amount_formatted || "Rp 0"}
            </p>
          </div>
        </Card>

        {/* Approved Requests */}
        <Card className="border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Total Disetujui
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-800">
                {summaryData?.approved_count || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-600">permohonan</span>
            </div>
            <p className="text-xs font-bold text-emerald-700 mt-1">
              {summaryData?.approved_amount_formatted || "Rp 0"}
            </p>
          </div>
        </Card>

        {/* Rejected Requests */}
        <Card className="border-gray-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ditolak
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {summaryData?.rejected_count || 0}
              </span>
              <span className="text-xs font-semibold text-gray-400">permohonan</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Tidak memenuhi syarat / dibatalkan admin</p>
          </div>
        </Card>

        {/* Cancelled Requests */}
        <Card className="border-gray-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dibatalkan Nasabah
            </span>
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {summaryData?.cancelled_count || 0}
              </span>
              <span className="text-xs font-semibold text-gray-400">permohonan</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Dibatalkan sendiri oleh nasabah</p>
          </div>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card
        title="Daftar Permohonan Penarikan"
        subtitle="Semua permohonan penarikan saldo nasabah yang masuk ke sistem"
      >
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 mb-4">
          {[
            { key: "ALL", label: "Semua Permohonan", badge: null },
            {
              key: "PENDING",
              label: "Menunggu Persetujuan",
              badge: summaryData?.pending_count > 0 ? summaryData.pending_count : null,
            },
            { key: "APPROVED", label: "Disetujui", badge: null },
            { key: "REJECTED", label: "Ditolak", badge: null },
            { key: "CANCELLED", label: "Dibatalkan", badge: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-primary-600 text-white font-semibold shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Date Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          <div className="sm:col-span-6">
            <Input
              placeholder="Cari nama nasabah, ID, no permohonan, atau no rekening..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              type="date"
              icon={Calendar}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              type="date"
              icon={Calendar}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={requestsData?.items || []}
          isLoading={isRequestsLoading}
          emptyMessage="Tidak ada permohonan penarikan saldo yang sesuai filter."
        />

        {requestsData?.pagination && (
          <div className="mt-4">
            <Pagination
              page={requestsData.pagination.page}
              totalPages={requestsData.pagination.total_pages}
              totalItems={requestsData.pagination.total}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>

      {/* Modal Persetujuan (Approve Modal) */}
      <Modal
        isOpen={Boolean(approveModalItem)}
        onClose={() => setApproveModalItem(null)}
        title="Setujui Permohonan Penarikan Saldo"
        subtitle={`Nomor Permohonan: ${approveModalItem?.request_no || ""}`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalItem(null)}
              disabled={approveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              isLoading={approveMutation.isPending}
              onClick={() =>
                approveMutation.mutate({
                  id: approveModalItem.id,
                  notes: approveNotes,
                })
              }
            >
              Ya, Setujui & Cairkan Saldo
            </Button>
          </>
        }
      >
        {approveModalItem && (
          <div className="space-y-4 text-xs">
            {/* Box Ringkasan */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nasabah:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {approveModalItem.nasabah_name} ({approveModalItem.nasabah_customer_id})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nominal Penarikan:</span>
                <span className="font-extrabold text-rose-600 text-base">
                  {approveModalItem.amount_formatted}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-200/60 pt-2">
                <span className="text-gray-600">Metode Penarikan:</span>
                <span className="font-bold text-gray-900">
                  {approveModalItem.method === "TUNAI"
                    ? "Uang Tunai (Cash di Pos BSU)"
                    : `Transfer Bank (${approveModalItem.bank_name})`}
                </span>
              </div>

              {approveModalItem.method === "TRANSFER" && (
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/50 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nomor Rekening:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {approveModalItem.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Atas Nama:</span>
                    <span className="font-semibold text-gray-900">
                      {approveModalItem.account_holder}
                    </span>
                  </div>
                </div>
              )}

              {approveModalItem.notes && (
                <div className="text-gray-600 pt-1">
                  <span className="font-medium text-gray-500">Pesan dari Nasabah:</span>
                  <p className="italic bg-white/60 p-2 rounded mt-0.5">
                    "{approveModalItem.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Konfirmasi Tindakan */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
              <p className="font-medium">
                Peringatan: Menyetujui permohonan ini akan otomatis:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] text-gray-500">
                <li>Memotong saldo tabungan nasabah sebesar <strong>{approveModalItem.amount_formatted}</strong>.</li>
                <li>Mencatat transaksi resmi jenis <strong>TARIK</strong> pada buku kas bank sampah.</li>
                <li>Menandai status permohonan menjadi <strong>Disetujui</strong>.</li>
              </ul>
            </div>

            {/* Catatan Admin Opsional */}
            <div>
              <Textarea
                label="Catatan Admin (Opsional)"
                placeholder="Contoh: Sudah ditransfer via BCA m-Banking / Uang tunai diserahkan di pos..."
                rows={2}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Penolakan (Reject Modal) */}
      <Modal
        isOpen={Boolean(rejectModalItem)}
        onClose={() => setRejectModalItem(null)}
        title="Tolak Permohonan Penarikan Saldo"
        subtitle={`Nomor Permohonan: ${rejectModalItem?.request_no || ""}`}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalItem(null)}
              disabled={rejectMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={X}
              isLoading={rejectMutation.isPending}
              onClick={handleConfirmReject}
            >
              Konfirmasi Tolak Permohonan
            </Button>
          </>
        }
      >
        {rejectModalItem && (
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Nasabah:</span>
                <span className="font-bold text-gray-900">
                  {rejectModalItem.nasabah_name} ({rejectModalItem.nasabah_customer_id})
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">Nominal Diajukan:</span>
                <span className="font-bold text-rose-600 text-sm">
                  {rejectModalItem.amount_formatted}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <Textarea
                required
                rows={3}
                placeholder="Tuliskan alasan penolakan secara jelas agar nasabah dapat memperbaikinya..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                error={rejectError}
              />
            </div>

            {/* Quick Reasons Chips */}
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Pilih Alasan Cepat:
              </span>
              <div className="space-y-1.5">
                {QUICK_REJECTION_REASONS.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRejectionReason(r);
                      if (rejectError) setRejectError("");
                    }}
                    className="w-full text-left p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-700 text-xs transition-colors cursor-pointer"
                  >
                    &bull; {r}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 italic">
              * Saldo nasabah tidak akan terpotong dan nasabah akan dapat melihat alasan penolakan ini di portal tabungan mereka.
            </p>
          </form>
        )}
      </Modal>

      {/* Modal Detail Permohonan */}
      <Modal
        isOpen={Boolean(detailModalItem)}
        onClose={() => setDetailModalItem(null)}
        title={`Detail Permohonan ${detailModalItem?.request_no || ""}`}
        size="md"
        footer={
          <Button variant="outline" size="sm" onClick={() => setDetailModalItem(null)}>
            Tutup
          </Button>
        }
      >
        {detailModalItem && (
          <div className="space-y-4 text-xs">
            {/* Header Status */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <span className="text-[11px] text-gray-500 uppercase font-semibold block">
                  Status Permohonan
                </span>
                <div className="mt-1">
                  <Badge variant={detailModalItem.status} size="lg">
                    {detailModalItem.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-500 uppercase font-semibold block">
                  Nominal Penarikan
                </span>
                <span className="text-lg font-extrabold text-rose-600">
                  {detailModalItem.amount_formatted}
                </span>
              </div>
            </div>

            {/* Rincian Nasabah */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
                Informasi Nasabah
              </h5>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Nama Nasabah:</span>
                <span className="font-semibold text-gray-900">{detailModalItem.nasabah_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">ID Customer / No. Rekening:</span>
                <span className="font-mono text-gray-900">
                  {detailModalItem.nasabah_customer_id} / {detailModalItem.nasabah_account_no}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Nomor Telepon:</span>
                <span className="text-gray-900">{detailModalItem.nasabah_phone || "-"}</span>
              </div>
            </div>

            {/* Rincian Metode Penarikan */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
                Metode Pembayaran
              </h5>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Metode:</span>
                <span className="font-semibold text-gray-900">
                  {detailModalItem.method === "TUNAI"
                    ? "Uang Tunai di Kantor BSU"
                    : `Transfer Bank (${detailModalItem.bank_name || "-"})`}
                </span>
              </div>

              {detailModalItem.method === "TRANSFER" && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Nomor Rekening / E-Wallet:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {detailModalItem.account_number || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Nama Pemilik (Atas Nama):</span>
                    <span className="font-semibold text-gray-900">
                      {detailModalItem.account_holder || "-"}
                    </span>
                  </div>
                </>
              )}

              {detailModalItem.notes && (
                <div className="py-1">
                  <span className="text-gray-500 block mb-0.5">Catatan Pengajuan:</span>
                  <p className="bg-gray-50 p-2 rounded text-gray-800 italic">
                    "{detailModalItem.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Audit Log / Riwayat Proses */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">
                Riwayat Pemrosesan
              </h5>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Waktu Pengajuan:</span>
                <span className="text-gray-900">{formatDateTime(detailModalItem.created_at)}</span>
              </div>

              {detailModalItem.status === "APPROVED" && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Disetujui Oleh:</span>
                    <span className="font-semibold text-emerald-700">
                      {detailModalItem.approver_name || "Admin"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Waktu Persetujuan:</span>
                    <span className="text-gray-900">{formatDateTime(detailModalItem.approved_at)}</span>
                  </div>
                  {detailModalItem.transaction_no && (
                    <div className="flex justify-between py-1 border-b border-gray-50 items-center">
                      <span className="text-gray-500">No. Transaksi Kas:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {detailModalItem.transaction_no}
                      </span>
                    </div>
                  )}
                </>
              )}

              {detailModalItem.status === "REJECTED" && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Ditolak Oleh:</span>
                    <span className="font-semibold text-rose-700">
                      {detailModalItem.rejector_name || "Admin"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Waktu Penolakan:</span>
                    <span className="text-gray-900">{formatDateTime(detailModalItem.rejected_at)}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-gray-500 block mb-0.5">Alasan Penolakan:</span>
                    <p className="bg-rose-50 text-rose-800 p-2.5 rounded border border-rose-100 font-medium">
                      {detailModalItem.rejection_reason || "-"}
                    </p>
                  </div>
                </>
              )}

              {detailModalItem.status === "CANCELLED" && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">Waktu Dibatalkan Nasabah:</span>
                  <span className="text-gray-900">{formatDateTime(detailModalItem.cancelled_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
