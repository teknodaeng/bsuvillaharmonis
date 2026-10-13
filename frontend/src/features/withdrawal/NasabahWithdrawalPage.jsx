import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  HandCoins,
  Building2,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Info,
  Calendar,
  Eye,
  X,
  CreditCard,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { withdrawalService } from "../../services/withdrawalService";
import { nasabahService } from "../../services/nasabahService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { DataTable } from "../../components/table/DataTable";
import { Pagination } from "../../components/table/Pagination";
import { formatRupiah } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

const POPULAR_BANKS = [
  { value: "BCA", label: "Bank Central Asia (BCA)" },
  { value: "BRI", label: "Bank Rakyat Indonesia (BRI)" },
  { value: "Mandiri", label: "Bank Mandiri" },
  { value: "BNI", label: "Bank Negara Indonesia (BNI)" },
  { value: "BSI", label: "Bank Syariah Indonesia (BSI)" },
  { value: "Bank Jatim", label: "Bank Jatim" },
  { value: "DANA", label: "DANA (E-Wallet)" },
  { value: "GoPay", label: "GoPay (E-Wallet)" },
  { value: "OVO", label: "OVO (E-Wallet)" },
  { value: "ShopeePay", label: "ShopeePay (E-Wallet)" },
  { value: "Lainnya", label: "Bank / E-Wallet Lainnya" },
];

export const NasabahWithdrawalPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // Form State
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("TUNAI");
  const [bankName, setBankName] = useState("BCA");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Filters State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [detailModalItem, setDetailModalItem] = useState(null);

  // Queries
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["nasabah-balance-me"],
    queryFn: () => nasabahService.getMyBalance(),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["nasabah-withdrawal-summary"],
    queryFn: () => withdrawalService.getMyWithdrawalSummary(),
  });

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: [
      "nasabah-withdrawal-requests",
      { status: statusFilter, page, page_size: pageSize },
    ],
    queryFn: () =>
      withdrawalService.getMyWithdrawalRequests({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        page_size: pageSize,
      }),
  });

  const currentBalance = Number(balanceData?.balance || 0);
  const pendingAmount = Number(summaryData?.pending_amount || 0);
  const availableBalance = Math.max(0, currentBalance - pendingAmount);

  // Mutation Create Request
  const createMutation = useMutation({
    mutationFn: (payload) => withdrawalService.requestWithdrawal(payload),
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Permohonan Berhasil Dikirim",
        message: `Permohonan penarikan ${data.request_no} sebesar ${data.amount_formatted} berhasil diajukan.`,
      });
      // Reset form
      setAmount("");
      setNotes("");
      setAccountNumber("");
      setAccountHolder("");
      setFormErrors({});
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["nasabah-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-withdrawal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-balance-me"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-dashboard"] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || "Gagal mengajukan permohonan penarikan.";
      addToast({
        type: "error",
        title: "Pengajuan Gagal",
        message: msg,
      });
    },
  });

  // Mutation Cancel Request
  const cancelMutation = useMutation({
    mutationFn: (id) => withdrawalService.cancelWithdrawalRequest(id),
    onSuccess: (data) => {
      addToast({
        type: "info",
        title: "Permohonan Dibatalkan",
        message: `Permohonan ${data.request_no} berhasil dibatalkan.`,
      });
      setCancelModalItem(null);
      queryClient.invalidateQueries({ queryKey: ["nasabah-withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-withdrawal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-balance-me"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-dashboard"] });
    },
    onError: (err) => {
      addToast({
        type: "error",
        title: "Pembatalan Gagal",
        message: err.response?.data?.message || err.message || "Gagal membatalkan permohonan.",
      });
    },
  });

  // Handle Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    const numAmount = parseInt(String(amount).replace(/[^0-9]/g, ""), 10);

    if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "Nominal penarikan wajib diisi dan harus lebih dari 0.";
    } else if (numAmount < 1000) {
      errors.amount = "Nominal penarikan minimal Rp 1.000.";
    } else if (numAmount > availableBalance) {
      errors.amount = `Nominal melebihi saldo yang tersedia untuk ditarik (${formatRupiah(availableBalance)}).`;
    }

    const resolvedBank = bankName === "Lainnya" ? customBankName.trim() : bankName;

    if (method === "TRANSFER") {
      if (!resolvedBank) {
        errors.bank_name = "Nama bank atau dompet digital wajib diisi.";
      }
      if (!accountNumber.trim()) {
        errors.account_number = "Nomor rekening atau nomor e-wallet wajib diisi.";
      }
      if (!accountHolder.trim()) {
        errors.account_holder = "Nama pemilik rekening wajib diisi.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    createMutation.mutate({
      amount: numAmount,
      method,
      bank_name: method === "TRANSFER" ? resolvedBank : null,
      account_number: method === "TRANSFER" ? accountNumber.trim() : null,
      account_holder: method === "TRANSFER" ? accountHolder.trim() : null,
      notes: notes.trim() || null,
    });
  };

  const handleQuickAmount = (val) => {
    const target = val === "ALL" ? availableBalance : val;
    setAmount(String(target));
    if (formErrors.amount) {
      setFormErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const parsedAmount = parseInt(String(amount).replace(/[^0-9]/g, ""), 10) || 0;
  const remainingAfter = Math.max(0, availableBalance - parsedAmount);

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
                <Banknote className="w-3 h-3" /> Tunai di Kantor BSU
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                <CreditCard className="w-3 h-3" /> Transfer {row.bank_name}
              </span>
            )}
          </div>
          {val === "TRANSFER" && (
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate max-w-[200px]">
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
      title: "Keterangan",
      key: "notes",
      render: (_, row) => {
        if (row.status === "REJECTED" && row.rejection_reason) {
          return (
            <div className="text-xs text-rose-600 bg-rose-50/80 p-1.5 rounded border border-rose-100 max-w-xs">
              <span className="font-semibold block">Alasan Penolakan:</span>
              <span className="text-[11px]">{row.rejection_reason}</span>
            </div>
          );
        }
        if (row.status === "APPROVED" && row.transaction_no) {
          return (
            <div className="text-xs text-emerald-700">
              <span className="font-medium text-[11px] block text-gray-500">No. Transaksi Kas:</span>
              <span className="font-mono font-semibold">{row.transaction_no}</span>
            </div>
          );
        }
        return (
          <span className="text-xs text-gray-500 italic max-w-xs truncate block">
            {row.notes || "-"}
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
          <Button
            variant="outline"
            size="xs"
            icon={Eye}
            onClick={() => setDetailModalItem(row)}
            title="Lihat Detail"
          >
            Detail
          </Button>

          {row.status === "PENDING" && (
            <Button
              variant="danger"
              size="xs"
              icon={X}
              onClick={() => setCancelModalItem(row)}
              title="Batalkan Permohonan"
            >
              Batal
            </Button>
          )}

          {row.status === "APPROVED" && row.transaction_id && (
            <Link to={`/riwayat/${row.transaction_id}/bukti`}>
              <Button variant="outline" size="xs" icon={Printer} title="Lihat Bukti">
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
        subtitle="Ajukan pencairan saldo tabungan bank sampah Anda secara tunai atau melalui transfer bank"
      />

      {/* Saldo Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Saldo */}
        <Card className="border-gray-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Saldo Tabungan
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatRupiah(currentBalance)}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">Akumulasi saldo tabungan Anda saat ini</p>
          </div>
        </Card>

        {/* Saldo Dalam Antrean (Pending) */}
        <Card className="border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Dalam Antrean (Pending)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-700">
              {formatRupiah(pendingAmount)}
            </span>
            <p className="text-[11px] text-amber-600 mt-1">
              {summaryData?.pending_count || 0} permohonan menunggu persetujuan
            </p>
          </div>
        </Card>

        {/* Saldo Tersedia Ditarik */}
        <Card className="border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Saldo Siap Ditarik
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">
              {formatRupiah(availableBalance)}
            </span>
            <p className="text-[11px] text-emerald-600 mt-1">
              Batas maksimal pengajuan permohonan baru
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Form Pengajuan & Petunjuk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Pengajuan Card */}
        <Card
          className="lg:col-span-8 shadow-xs border-gray-200/80"
          title="Formulir Pengajuan Penarikan Saldo"
          subtitle="Isi nominal dan pilih metode pencairan yang Anda kehendaki"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Nominal */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Nominal Penarikan (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-sm font-bold text-gray-500">Rp</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 50.000"
                  value={amount ? parseInt(amount, 10).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setAmount(raw);
                    if (formErrors.amount) {
                      setFormErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 font-semibold text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-colors"
                />
              </div>
              {formErrors.amount && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{formErrors.amount}</p>
              )}

              {/* Quick Amount Buttons */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 mr-1">Nominal Cepat:</span>
                {[20000, 50000, 100000, 200000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={val > availableBalance}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {formatRupiah(val)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickAmount("ALL")}
                  disabled={availableBalance <= 0}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Tarik Semua Saldo
                </button>
              </div>
            </div>

            {/* Pilihan Metode Penarikan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Metode Penarikan Dana <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* TUNAI */}
                <div
                  onClick={() => setMethod("TUNAI")}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    method === "TUNAI"
                      ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      method === "TUNAI"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">Uang Tunai (Cash)</h4>
                      {method === "TUNAI" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pengambilan langsung di pos / kantor Bank Sampah Villa Harmonis
                    </p>
                  </div>
                </div>

                {/* TRANSFER */}
                <div
                  onClick={() => setMethod("TRANSFER")}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    method === "TRANSFER"
                      ? "border-blue-500 bg-blue-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      method === "TRANSFER"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">Transfer Bank / E-Wallet</h4>
                      {method === "TRANSFER" && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ditransfer langsung ke rekening bank atau akun dompet digital Anda
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Khusus TRANSFER */}
            {method === "TRANSFER" && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3.5">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs border-b border-blue-100 pb-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Rincian Rekening / Akun Tujuan Transfer</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Select
                      label="Nama Bank / E-Wallet"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      options={POPULAR_BANKS}
                      error={formErrors.bank_name}
                    />
                  </div>

                  {bankName === "Lainnya" && (
                    <div>
                      <Input
                        label="Sebutkan Bank / E-Wallet Lain"
                        required
                        placeholder="Contoh: Bank Danamon"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        error={formErrors.bank_name}
                      />
                    </div>
                  )}

                  <div>
                    <Input
                      label="Nomor Rekening / No. HP E-Wallet"
                      required
                      placeholder="Contoh: 1234567890 atau 0812..."
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        if (formErrors.account_number) {
                          setFormErrors((prev) => ({ ...prev, account_number: undefined }));
                        }
                      }}
                      error={formErrors.account_number}
                    />
                  </div>

                  <div className={bankName === "Lainnya" ? "sm:col-span-2" : ""}>
                    <Input
                      label="Nama Pemilik Rekening (Atas Nama)"
                      required
                      placeholder="Contoh: Budi Santoso"
                      value={accountHolder}
                      onChange={(e) => {
                        setAccountHolder(e.target.value);
                        if (formErrors.account_holder) {
                          setFormErrors((prev) => ({ ...prev, account_holder: undefined }));
                        }
                      }}
                      error={formErrors.account_holder}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Catatan Tambahan */}
            <div>
              <Textarea
                label="Catatan Pengajuan (Opsional)"
                placeholder="Tambahkan pesan atau catatan jika diperlukan..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Calculation Preview */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-gray-500">
                  Saldo Tersedia Saat Ini:{" "}
                  <span className="font-semibold text-gray-800">
                    {formatRupiah(availableBalance)}
                  </span>
                </div>
                <div className="text-gray-500">
                  Nominal Penarikan:{" "}
                  <span className="font-bold text-rose-600">
                    {formatRupiah(parsedAmount)}
                  </span>
                </div>
              </div>
              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Perkiraan Sisa Saldo Tersedia:
                </span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatRupiah(remainingAfter)}
                </span>
              </div>
            </div>

            {/* Tombol Kirim */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={HandCoins}
                isLoading={createMutation.isPending}
                disabled={
                  parsedAmount <= 0 ||
                  parsedAmount > availableBalance ||
                  availableBalance <= 0 ||
                  createMutation.isPending
                }
              >
                Kirim Permohonan Penarikan
              </Button>
            </div>
          </form>
        </Card>

        {/* Informasi / Panduan Card */}
        <div className="lg:col-span-4 space-y-4">
          <Card
            className="border-gray-200/80 shadow-xs bg-gradient-to-br from-white to-gray-50/50"
            title="Informasi & Alur Penarikan"
          >
            <div className="space-y-3.5 text-xs text-gray-600">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  1
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Pengajuan Oleh Nasabah</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Nasabah menentukan nominal penarikan dan metode (tunai atau transfer rekening).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  2
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Verifikasi Admin Bank Sampah</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Admin memeriksa ketersediaan saldo dan validitas data sebelum menyetujui atau menolak permohonan.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                  3
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Pencairan & Pemotongan Saldo</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Jika disetujui, dana dicairkan dan saldo Anda otomatis terpotong dengan nomor transaksi resmi.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2 mt-4">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Permohonan yang masih berstatus <strong>Menunggu Persetujuan</strong> dapat Anda batalkan sewaktu-waktu jika berubah pikiran.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Riwayat Permohonan Penarikan */}
      <Card
        title="Riwayat Permohonan Penarikan Saya"
        subtitle="Daftar seluruh pengajuan penarikan tabungan yang pernah Anda buat beserta statusnya"
      >
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 mb-4">
          {[
            { key: "ALL", label: "Semua Permohonan" },
            { key: "PENDING", label: "Menunggu Persetujuan" },
            { key: "APPROVED", label: "Disetujui" },
            { key: "REJECTED", label: "Ditolak" },
            { key: "CANCELLED", label: "Dibatalkan" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-primary-600 text-white font-semibold shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={requestsData?.items || []}
          isLoading={isRequestsLoading}
          emptyMessage="Belum ada riwayat permohonan penarikan saldo."
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

      {/* Modal Konfirmasi Pembatalan */}
      <Modal
        isOpen={Boolean(cancelModalItem)}
        onClose={() => setCancelModalItem(null)}
        title="Konfirmasi Pembatalan Permohonan"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalItem(null)}
              disabled={cancelMutation.isPending}
            >
              Tutup
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={X}
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(cancelModalItem.id)}
            >
              Ya, Batalkan Permohonan
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-gray-600">
          <p>
            Apakah Anda yakin ingin membatalkan permohonan penarikan saldo{" "}
            <strong>{cancelModalItem?.request_no}</strong> sebesar{" "}
            <strong className="text-gray-900">{cancelModalItem?.amount_formatted}</strong>?
          </p>
          <p className="text-gray-500">
            Setelah dibatalkan, saldo akan kembali sepenuhnya dapat diajukan pada permohonan baru.
          </p>
        </div>
      </Modal>

      {/* Modal Detail Permohonan */}
      <Modal
        isOpen={Boolean(detailModalItem)}
        onClose={() => setDetailModalItem(null)}
        title={`Rincian Permohonan ${detailModalItem?.request_no || ""}`}
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <span className="text-[11px] text-gray-500 uppercase font-semibold block">
                  Status Saat Ini
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

            {/* Rincian Permohonan */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Waktu Pengajuan:</span>
                <span className="font-semibold text-gray-900">
                  {formatDateTime(detailModalItem.created_at)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Metode Penarikan:</span>
                <span className="font-semibold text-gray-900">
                  {detailModalItem.method === "TUNAI"
                    ? "Tunai di Kantor BSU"
                    : `Transfer Bank (${detailModalItem.bank_name || "-"})`}
                </span>
              </div>

              {detailModalItem.method === "TRANSFER" && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Nomor Rekening:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {detailModalItem.account_number || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Atas Nama (Pemilik):</span>
                    <span className="font-semibold text-gray-900">
                      {detailModalItem.account_holder || "-"}
                    </span>
                  </div>
                </>
              )}

              {detailModalItem.notes && (
                <div className="py-1">
                  <span className="text-gray-500 block mb-0.5">Catatan Nasabah:</span>
                  <p className="bg-gray-50 p-2 rounded text-gray-800 italic">
                    "{detailModalItem.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Keterangan Jika Disetujui / Ditolak */}
            {detailModalItem.status === "APPROVED" && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Permohonan Telah Disetujui Admin</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Disetujui pada {formatDateTime(detailModalItem.approved_at)} oleh{" "}
                  <strong>{detailModalItem.approver_name || "Admin"}</strong>.
                </p>
                {detailModalItem.transaction_no && (
                  <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between">
                    <span>No. Transaksi Kas: {detailModalItem.transaction_no}</span>
                    <Link to={`/riwayat/${detailModalItem.transaction_id}/bukti`}>
                      <span className="underline font-semibold cursor-pointer text-emerald-800 hover:text-emerald-900">
                        Buka Bukti Transaksi &rarr;
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {detailModalItem.status === "REJECTED" && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Permohonan Ditolak Admin</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Ditolak pada {formatDateTime(detailModalItem.rejected_at)} oleh{" "}
                  <strong>{detailModalItem.rejector_name || "Admin"}</strong>.
                </p>
                {detailModalItem.rejection_reason && (
                  <div className="mt-2 p-2 rounded bg-white/80 border border-rose-200">
                    <span className="font-semibold block text-[11px] text-rose-900">
                      Alasan Penolakan:
                    </span>
                    <p className="text-xs text-rose-800 mt-0.5">
                      {detailModalItem.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
