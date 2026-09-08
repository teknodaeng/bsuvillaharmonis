import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  DollarSign,
  Printer,
  ChevronRight,
  Scale,
  Layers,
} from "lucide-react";
import { dashboardService } from "../../services/dashboardService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/table/DataTable";
import { formatDateTime, formatKg } from "../../utils/formatting";
import { formatRupiah } from "../../utils/currency";

export const NasabahDashboardPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["nasabah-dashboard"],
    queryFn: () => dashboardService.getNasabahDashboard(),
  });

  const columns = [
    {
      title: "Tanggal",
      key: "transaction_date",
      render: (val) => formatDateTime(val),
    },
    {
      title: "No. Transaksi",
      key: "transaction_no",
      render: (val) => <span className="font-mono font-medium">{val}</span>,
    },
    {
      title: "Jenis",
      key: "type",
      render: (val) => <Badge variant={val}>{val}</Badge>,
    },
    {
      title: "Kategori / Berat",
      key: "category",
      render: (_, row) =>
        row.type === "SETOR" ? (
          <div>
            <span className="font-medium text-gray-800">{row.category?.name || "-"}</span>
            <span className="block text-[11px] text-gray-400">
              {formatKg(row.weight_gram, true)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">Tarik Tunai</span>
        ),
    },
    {
      title: "Nominal",
      key: "amount",
      align: "right",
      render: (val, row) => (
        <span
          className={
            row.type === "SETOR" ? "font-bold text-emerald-600" : "font-bold text-rose-600"
          }
        >
          {row.type === "SETOR" ? `+${formatRupiah(val)}` : `-${formatRupiah(val)}`}
        </span>
      ),
    },
    {
      title: "Saldo Akhir",
      key: "balance_after",
      align: "right",
      render: (val) => <span className="font-semibold text-gray-900">{formatRupiah(val)}</span>,
    },
    {
      title: "Aksi",
      key: "id",
      align: "center",
      render: (id) => (
        <Button
          variant="outline"
          size="xs"
          icon={Printer}
          onClick={() => navigate(`/riwayat/${id}/bukti`)}
        >
          Bukti
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-700 via-emerald-600 to-teal-700 p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-1 rounded-full bg-white/20 text-emerald-100 text-[11px] font-semibold tracking-wide uppercase mb-2 backdrop-blur-xs">
              ID Nasabah: {data?.customer_id || "..."}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Halo, {data?.name || "Nasabah"}!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">
              Selamat datang di portal tabungan Bank Sampah Villa Harmonis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/riwayat">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-xs"
                icon={History}
              >
                Riwayat Transaksi
              </Button>
            </Link>
            <Link to="/harga-sampah">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-xs"
                icon={DollarSign}
              >
                Katalog Harga
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <Card className="border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Saldo Tabungan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
              {data?.balance_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">Saldo aktif siap tarik</p>
          </div>
        </Card>

        {/* Total Setor Card */}
        <Card className="border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Setoran
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {data?.total_setor_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">Akumulasi hasil setor sampah</p>
          </div>
        </Card>

        {/* Total Berat Sampah Disetor */}
        <Card className="border-gray-200/80 bg-gradient-to-br from-white to-teal-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Sampah Disetor
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-teal-700">
              {data?.total_weight_kg_formatted || "0,00 kg"}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">Total kontribusi daur ulang Anda</p>
          </div>
        </Card>

        {/* Total Tarik Card */}
        <Card className="border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Penarikan
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {data?.total_tarik_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">Akumulasi dana yang telah ditarik</p>
          </div>
        </Card>
      </div>

      {/* Rincian Setoran Sampah per Kategori (Kg) */}
      <Card
        title="Rincian Sampah yang Anda Setor per Kategori"
        subtitle="Akumulasi berat dalam Kilogram (Kg) dan hasil tabungan yang Anda peroleh per jenis sampah"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Total Disetor: {data?.total_weight_kg_formatted || "0,00 kg"}
            </span>
          </div>
        }
      >
        {data?.categories_weight && data.categories_weight.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.categories_weight.map((cat) => (
              <div
                key={cat.category_id}
                className="p-4 rounded-xl border border-gray-100 bg-white hover:border-teal-200 hover:shadow-xs transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                      <h4
                        className="font-semibold text-gray-900 text-sm truncate"
                        title={cat.category_name}
                      >
                        {cat.category_name}
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 shrink-0 border border-teal-200/50 font-mono">
                      {cat.percentage}%
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        {cat.total_weight_kg.toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs font-bold text-teal-600 uppercase ml-1.5">
                        Kg
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {cat.transaction_count}x disetor
                    </span>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(cat.total_weight_kg > 0 ? 4 : 0, cat.percentage))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Hasil Tabungan:</span>
                  <span className="font-bold text-emerald-700">{cat.total_amount_formatted}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <Scale className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-gray-800">
              Belum Ada Sampah yang Disetorkan
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Pilah sampah anorganik Anda di rumah dan setorkan ke Bank Sampah Villa Harmonis
              untuk mengonversinya menjadi saldo tabungan!
            </p>
            <div className="mt-4">
              <Link to="/harga-sampah">
                <Button variant="outline" size="xs" icon={DollarSign}>
                  Cek Katalog Harga Sampah
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Recent Transactions Table */}
      <Card
        title="Transaksi Terakhir"
        subtitle="5 aktivitas penyetoran atau penarikan tabungan terakhir Anda"
        action={
          <Link
            to="/riwayat"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Link>
        }
      >
        <DataTable
          columns={columns}
          data={data?.recent_transactions || []}
          isLoading={isLoading}
          emptyMessage="Anda belum memiliki transaksi tabungan bank sampah."
        />
      </Card>
    </div>
  );
};
