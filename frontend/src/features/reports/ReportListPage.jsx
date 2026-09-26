import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Users,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { reportService } from "../../services/reportService";
import { nasabahService } from "../../services/nasabahService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { downloadBlob } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const ReportListPage = () => {
  const { addToast } = useUIStore();

  // Active Nasabah List for Dropdown
  const { data: activeNasabahData, isLoading: isLoadingNasabah } = useQuery({
    queryKey: ["active-nasabah-options"],
    queryFn: () => nasabahService.listNasabah({ status: "ACTIVE", page_size: 500 }),
  });

  const activeNasabahOptions = [
    { label: "Semua Nasabah Aktif (Seluruh Anggota)", value: "" },
    ...(activeNasabahData?.items || []).map((n) => ({
      label: `[${n.customer_id}] ${n.name} (${n.nasabah_category || "Individu"})`,
      value: n.id,
    })),
  ];

  // 1. Feature: Laporan Riwayat Transaksi Setiap Nasabah Aktif
  const [activeNasabahId, setActiveNasabahId] = useState("");
  const [activeStartDate, setActiveStartDate] = useState("");
  const [activeEndDate, setActiveEndDate] = useState("");
  const [activeType, setActiveType] = useState("");
  const [isActiveDownloading, setIsActiveDownloading] = useState(false);

  // 2. Transaction Report Filter (Umum / Global Ledger)
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txType, setTxType] = useState("");
  const [txNasabahId, setTxNasabahId] = useState("");
  const [isTxDownloading, setIsTxDownloading] = useState(false);

  // 3. Category Recap Report Filter
  const [catStartDate, setCatStartDate] = useState("");
  const [catEndDate, setCatEndDate] = useState("");
  const [isCatDownloading, setIsCatDownloading] = useState(false);

  // Handler: Laporan Riwayat Transaksi Setiap Nasabah Aktif
  const handleDownloadActiveNasabah = async (format) => {
    setIsActiveDownloading(true);
    try {
      const params = {
        nasabah_id: activeNasabahId || undefined,
        start_date: activeStartDate || undefined,
        end_date: activeEndDate || undefined,
        type: activeType || undefined,
      };

      const selectedNasabah = activeNasabahData?.items?.find((n) => n.id === activeNasabahId);
      const suffix = selectedNasabah
        ? `${selectedNasabah.customer_id}_${selectedNasabah.name.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "Semua_Nasabah_Aktif";

      if (format === "excel") {
        const blob = await reportService.downloadActiveNasabahTransactionsExcel(params);
        downloadBlob(blob, `Laporan_Riwayat_Transaksi_${suffix}_${Date.now()}.xlsx`);
      } else {
        const blob = await reportService.downloadActiveNasabahTransactionsPdf(params);
        downloadBlob(blob, `Laporan_Riwayat_Transaksi_${suffix}_${Date.now()}.pdf`);
      }

      addToast({
        title: "Download Berhasil",
        message: `Laporan riwayat transaksi nasabah aktif (.${format === "excel" ? "xlsx" : "pdf"}) berhasil diunduh.`,
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Gagal Mengunduh Laporan",
        message: err.message,
        type: "danger",
      });
    } finally {
      setIsActiveDownloading(false);
    }
  };

  const handleDownloadTx = async (format) => {
    setIsTxDownloading(true);
    try {
      const params = {
        nasabah_id: txNasabahId || undefined,
        start_date: txStartDate || undefined,
        end_date: txEndDate || undefined,
        type: txType || undefined,
      };
      if (format === "excel") {
        const blob = await reportService.downloadTransactionsExcel(params);
        downloadBlob(blob, `Laporan_Transaksi_${Date.now()}.xlsx`);
      } else {
        const blob = await reportService.downloadTransactionsPdf(params);
        downloadBlob(blob, `Laporan_Transaksi_${Date.now()}.pdf`);
      }
      addToast({
        title: "Download Selesai",
        message: `Laporan transaksi (.${format === "excel" ? "xlsx" : "pdf"}) berhasil diunduh.`,
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Gagal Mengunduh Laporan",
        message: err.message,
        type: "danger",
      });
    } finally {
      setIsTxDownloading(false);
    }
  };

  const handleDownloadCat = async (format) => {
    setIsCatDownloading(true);
    try {
      const params = {
        start_date: catStartDate || undefined,
        end_date: catEndDate || undefined,
      };
      if (format === "excel") {
        const blob = await reportService.downloadCategoryRecapExcel(params);
        downloadBlob(blob, `Rekap_Kategori_Sampah_${Date.now()}.xlsx`);
      } else {
        const blob = await reportService.downloadCategoryRecapPdf(params);
        downloadBlob(blob, `Rekap_Kategori_Sampah_${Date.now()}.pdf`);
      }
      addToast({
        title: "Download Selesai",
        message: `Rekapitulasi kategori (.${format === "excel" ? "xlsx" : "pdf"}) berhasil diunduh.`,
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Gagal Mengunduh Laporan",
        message: err.message,
        type: "danger",
      });
    } finally {
      setIsCatDownloading(false);
    }
  };

  const handleDownloadNasabah = async (format) => {
    try {
      if (format === "excel") {
        const blob = await reportService.downloadNasabahExcel();
        downloadBlob(blob, `Laporan_Data_Nasabah_${Date.now()}.xlsx`);
      } else {
        const blob = await reportService.downloadNasabahPdf();
        downloadBlob(blob, `Laporan_Data_Nasabah_${Date.now()}.pdf`);
      }
      addToast({
        title: "Download Selesai",
        message: `Laporan nasabah (.${format === "excel" ? "xlsx" : "pdf"}) berhasil diunduh.`,
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Gagal Mengunduh Laporan",
        message: err.message,
        type: "danger",
      });
    }
  };

  const handleDownloadPrices = async (format) => {
    try {
      if (format === "excel") {
        const blob = await reportService.downloadPricesExcel();
        downloadBlob(blob, `Laporan_Master_Harga_${Date.now()}.xlsx`);
      } else {
        const blob = await reportService.downloadPricesPdf();
        downloadBlob(blob, `Laporan_Master_Harga_${Date.now()}.pdf`);
      }
      addToast({
        title: "Download Selesai",
        message: `Laporan harga (.${format === "excel" ? "xlsx" : "pdf"}) berhasil diunduh.`,
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Gagal Mengunduh Laporan",
        message: err.message,
        type: "danger",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Laporan & Rekapitulasi"
        subtitle="Unduh berkas laporan operasional, keuangan, dan mutasi transaksi nasabah dalam format Excel (.xlsx) dan PDF (.pdf)"
      />

      {/* Featured Card: Laporan Riwayat Transaksi Setiap Nasabah Aktif */}
      <Card
        className="border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-sm"
        headerClassName="bg-emerald-50/60 border-b border-emerald-100"
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
              <UserCheck className="w-4 h-4" />
            </span>
            <span className="text-gray-900 font-bold text-base">
              Laporan Riwayat Transaksi Setiap Nasabah Aktif
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              Unggulan
            </span>
          </div>
        }
        subtitle="Mencetak mutasi buku tabungan lengkap (setor sampah & tarik saldo) untuk setiap nasabah aktif, mencakup profil nasabah, saldo berjalan, subtotal per nasabah, dan lembar rekapitulasi ringkasan."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="md:col-span-3 lg:col-span-1">
            <Select
              label="Pilih Nasabah Aktif"
              value={activeNasabahId}
              onChange={(e) => setActiveNasabahId(e.target.value)}
              options={activeNasabahOptions}
              disabled={isLoadingNasabah}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Pilih <strong className="text-emerald-700">Semua Nasabah Aktif</strong> untuk rekapitulasi massal seluruh anggota aktif, atau pilih nama nasabah spesifik.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:col-span-2 lg:col-span-1">
            <Input
              label="Dari Tanggal"
              type="date"
              value={activeStartDate}
              onChange={(e) => setActiveStartDate(e.target.value)}
            />
            <Input
              label="Sampai Tanggal"
              type="date"
              value={activeEndDate}
              onChange={(e) => setActiveEndDate(e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <Select
              label="Jenis Mutasi Transaksi"
              placeholder="Semua Mutasi (Setor & Tarik)"
              value={activeType}
              onChange={(e) => setActiveType(e.target.value)}
              options={[
                { label: "Semua Mutasi (Setor & Tarik)", value: "" },
                { label: "Setoran Sampah Saja (SETOR)", value: "SETOR" },
                { label: "Penarikan Saldo Saja (TARIK)", value: "TARIK" },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-emerald-100">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Format berkas resmi dilengkapi kop bank, identitas nasabah, rincian timbangan, dan rekap saldo.</span>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="flex-1 sm:flex-none text-emerald-800 border-emerald-300 hover:bg-emerald-100/60 font-semibold"
              icon={FileSpreadsheet}
              isLoading={isActiveDownloading}
              onClick={() => handleDownloadActiveNasabah("excel")}
            >
              Unduh Excel (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 font-semibold shadow-sm"
              icon={FileText}
              isLoading={isActiveDownloading}
              onClick={() => handleDownloadActiveNasabah("pdf")}
            >
              Unduh PDF Landscape (.pdf)
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid 4 Standard Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report 1: Transaksi Kronologis Global */}
        <Card
          title="1. Laporan Transaksi Kronologis"
          subtitle="Daftar mutasi setoran dan penarikan tabungan secara berurutan sesuai tanggal"
        >
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Dari Tanggal"
                type="date"
                value={txStartDate}
                onChange={(e) => setTxStartDate(e.target.value)}
              />
              <Input
                label="Sampai Tanggal"
                type="date"
                value={txEndDate}
                onChange={(e) => setTxEndDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                label="Jenis Mutasi"
                placeholder="Semua Jenis (Setor & Tarik)"
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                options={[
                  { label: "Setor Sampah Saja (SETOR)", value: "SETOR" },
                  { label: "Tarik Tunai Saja (TARIK)", value: "TARIK" },
                ]}
              />
              <Select
                label="Filter Nasabah (Opsional)"
                placeholder="Semua Nasabah"
                value={txNasabahId}
                onChange={(e) => setTxNasabahId(e.target.value)}
                options={activeNasabahOptions}
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              icon={FileSpreadsheet}
              isLoading={isTxDownloading}
              onClick={() => handleDownloadTx("excel")}
            >
              Unduh Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-rose-700 border-rose-300 hover:bg-rose-50"
              icon={FileText}
              isLoading={isTxDownloading}
              onClick={() => handleDownloadTx("pdf")}
            >
              Unduh PDF (.pdf)
            </Button>
          </div>
        </Card>

        {/* Report 2: Rekap Kategori */}
        <Card
          title="2. Rekapitulasi Kategori Sampah"
          subtitle="Total tonase (kg) dan akumulasi rupiah per kategori sampah"
        >
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Dari Tanggal"
                type="date"
                value={catStartDate}
                onChange={(e) => setCatStartDate(e.target.value)}
              />
              <Input
                label="Sampai Tanggal"
                type="date"
                value={catEndDate}
                onChange={(e) => setCatEndDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">
              Kosongkan tanggal untuk melihat rekapitulasi seluruh masa operasional.
            </p>
          </div>

          <div className="flex gap-2.5 pt-7 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              icon={FileSpreadsheet}
              isLoading={isCatDownloading}
              onClick={() => handleDownloadCat("excel")}
            >
              Unduh Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-rose-700 border-rose-300 hover:bg-rose-50"
              icon={FileText}
              isLoading={isCatDownloading}
              onClick={() => handleDownloadCat("pdf")}
            >
              Unduh PDF (.pdf)
            </Button>
          </div>
        </Card>

        {/* Report 3: Nasabah */}
        <Card
          title="3. Laporan Data & Saldo Nasabah"
          subtitle="Rekap seluruh nasabah terdaftar beserta posisi saldo tabungan terakhir"
        >
          <p className="text-xs text-gray-500 mb-6">
            Berisi daftar nama nasabah, NIK, No. Rekening, kontak HP, alamat domisili, status keaktifan, dan posisi saldo tabungan saat ini sebagai dasar kewajiban simpanan bank.
          </p>

          <div className="flex gap-2.5 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              icon={FileSpreadsheet}
              onClick={() => handleDownloadNasabah("excel")}
            >
              Unduh Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-rose-700 border-rose-300 hover:bg-rose-50"
              icon={FileText}
              onClick={() => handleDownloadNasabah("pdf")}
            >
              Unduh PDF (.pdf)
            </Button>
          </div>
        </Card>

        {/* Report 4: Harga Sampah */}
        <Card
          title="4. Laporan Master Harga Sampah"
          subtitle="Daftar tarif harga beli sampah aktif untuk seluruh kategori"
        >
          <p className="text-xs text-gray-500 mb-6">
            Berisi seluruh kategori sampah yang terdaftar, tarif aktif per kilogram, kelompok sampah, barang contoh, dan tanggal mulai berlaku harga.
          </p>

          <div className="flex gap-2.5 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              icon={FileSpreadsheet}
              onClick={() => handleDownloadPrices("excel")}
            >
              Unduh Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-rose-700 border-rose-300 hover:bg-rose-50"
              icon={FileText}
              onClick={() => handleDownloadPrices("pdf")}
            >
              Unduh PDF (.pdf)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
