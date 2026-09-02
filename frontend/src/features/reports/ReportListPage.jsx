import React, { useState } from "react";
import { FileSpreadsheet, FileText, Download, Calendar, Filter } from "lucide-react";
import { reportService } from "../../services/reportService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { downloadBlob } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const ReportListPage = () => {
  const { addToast } = useUIStore();

  // Transaction Report Filter
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txType, setTxType] = useState("");
  const [isTxDownloading, setIsTxDownloading] = useState(false);

  // Category Recap Report Filter
  const [catStartDate, setCatStartDate] = useState("");
  const [catEndDate, setCatEndDate] = useState("");
  const [isCatDownloading, setIsCatDownloading] = useState(false);

  const handleDownloadTx = async (format) => {
    setIsTxDownloading(true);
    try {
      const params = {
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
        subtitle="Unduh laporan operasional dan keuangan bank sampah dalam format Excel (.xlsx) dan PDF (.pdf)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report 1: Transaksi */}
        <Card
          title="1. Laporan Riwayat Transaksi"
          subtitle="Daftar mutasi setoran dan penarikan tabungan lengkap"
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
          subtitle="Rekap seluruh nasabah aktif beserta saldo tabungan terakhir"
        >
          <p className="text-xs text-gray-500 mb-6">
            Berisi daftar nama nasabah, NIK, No. Rekening, kontak HP, alamat, tanggal registrasi, dan posisi saldo tabungan saat ini.
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
            Berisi seluruh kategori sampah yang terdaftar, tarif aktif per kilogram, dan tanggal mulai berlaku harga.
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
