import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download, ArrowLeft, Recycle, CheckCircle2 } from "lucide-react";
import { receiptService } from "../../services/receiptService";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { downloadBlob } from "../../utils/formatting";

export const ReceiptPage = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["transaction-receipt", transactionId, isAdmin],
    queryFn: () =>
      isAdmin
        ? receiptService.getAdminReceiptData(transactionId)
        : receiptService.getMyReceiptData(transactionId),
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = isAdmin
        ? await receiptService.getAdminReceiptPdf(transactionId)
        : await receiptService.getMyReceiptPdf(transactionId);
      downloadBlob(blob, `Bukti_Transaksi_${receipt?.transaction_no || transactionId}.pdf`);
    } catch (err) {
      alert("Gagal mengunduh file PDF: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Spinner size="lg" />
        <p className="text-xs text-gray-500 mt-2">Memuat struk bukti transaksi...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="py-20 text-center text-red-500 text-sm">
        Bukti transaksi tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs">
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Kembali
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownloadPdf}
          >
            Unduh PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Cetak Struk (Print)
          </Button>
        </div>
      </div>

      {/* Printable Receipt Paper */}
      <div className="print-area bg-white rounded-2xl border border-gray-200/90 shadow-lg p-6 sm:p-8 text-gray-800 max-w-md mx-auto">
        {/* Receipt Header */}
        <div className="text-center pb-4 border-b-2 border-dashed border-gray-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white mb-2 shadow-xs">
            <Recycle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">
            {receipt.app_name || receipt.bank_name || "BSU Villa Harmonis"}
          </h2>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            {receipt.title || "BUKTI TRANSAKSI TABUNGAN BANK SAMPAH"}
          </p>
        </div>

        {/* Transaction Meta */}
        <div className="py-3 border-b border-dashed border-gray-200 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">No. Transaksi:</span>
            <span className="font-bold text-gray-900">{receipt.transaction_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Tanggal/Waktu:</span>
            <span className="text-gray-700">{receipt.transaction_date_formatted || receipt.transaction_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Petugas Kasir:</span>
            <span className="text-gray-700">{receipt.officer_name || "Admin BSU"}</span>
          </div>
        </div>

        {/* Nasabah Info */}
        <div className="py-3 border-b border-dashed border-gray-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono">ID Nasabah:</span>
            <span className="font-bold font-mono text-emerald-800">
              {receipt.nasabah?.customer_id || receipt.customer_id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono">No. Rekening:</span>
            <span className="font-bold font-mono text-gray-700">
              {receipt.nasabah?.account_no || receipt.account_no}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Nama Nasabah:</span>
            <span className="font-semibold text-gray-900">
              {receipt.nasabah?.name || receipt.nasabah_name}
            </span>
          </div>
        </div>

        {/* Itemized Detail */}
        <div className="py-4 border-b-2 border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {receipt.type === "SETOR" ? "RINCIAN SETORAN SAMPAH" : "RINCIAN PENARIKAN TUNAI"}
            </span>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                receipt.type === "SETOR"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {receipt.type_display || (receipt.type === "SETOR" ? "SETOR" : "TARIK TUNAI")}
            </span>
          </div>

          {receipt.type === "SETOR" ? (
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Kategori:</span>
                <span className="font-semibold text-gray-900">
                  {receipt.detail?.category_name || receipt.category_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Berat Timbangan:</span>
                <span className="font-bold text-gray-900">
                  {receipt.detail?.weight_formatted || receipt.weight_formatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tarif Satuan:</span>
                <span className="text-gray-900">
                  {receipt.detail?.price_formatted || receipt.price_per_kg_formatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 font-mono">
              Penarikan saldo tabungan secara tunai melalui petugas loket.
            </div>
          )}

          <div className="mt-3 flex justify-between items-baseline pt-2">
            <span className="text-xs font-bold text-gray-600 uppercase">
              {receipt.type === "SETOR" ? "Total Kredit (Masuk):" : "Total Debit (Keluar):"}
            </span>
            <span
              className={`text-lg font-black font-mono ${
                receipt.type === "SETOR" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {receipt.type === "SETOR"
                ? `+${receipt.mutation?.credit_formatted || receipt.amount_formatted}`
                : `-${receipt.mutation?.debit_formatted || receipt.amount_formatted}`}
            </span>
          </div>
        </div>

        {/* Balance Mutation */}
        <div className="py-3 border-b-2 border-dashed border-gray-200 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between font-bold">
            <span className="text-gray-900">Saldo Akhir Saat Ini:</span>
            <span className="text-emerald-800 text-sm">
              {receipt.mutation?.balance_after_formatted || receipt.balance_after_formatted}
            </span>
          </div>
        </div>

        {/* Footer Notes & Signatures */}
        <div className="pt-4 text-center">
          <p className="text-[10px] text-gray-400 italic mb-6">
            "{receipt.footer || receipt.footer_text || "Terima kasih telah menjaga kebersihan lingkungan bersama kami."}"
          </p>

          <div className="grid grid-cols-2 gap-4 text-center text-[11px] text-gray-500 font-mono pt-4">
            <div>
              <p>Nasabah,</p>
              <div className="h-12"></div>
              <p className="border-t border-gray-300 pt-1 font-semibold text-gray-700 truncate">
                {receipt.nasabah?.name || receipt.nasabah_name}
              </p>
            </div>
            <div>
              <p>Petugas Bank Sampah,</p>
              <div className="h-12"></div>
              <p className="border-t border-gray-300 pt-1 font-semibold text-gray-700 truncate">
                {receipt.officer_name || "Admin BSU"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
