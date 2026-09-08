import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  PlusCircle,
  UserPlus,
  FileText,
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

export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => dashboardService.getAdminDashboard(),
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
      title: "Nasabah",
      key: "nasabah_name",
      render: (_, row) => (
        <div>
          <span className="font-medium text-gray-900">{row.nasabah_name}</span>
          <span className="block text-[11px] text-gray-400 font-mono">
            {row.nasabah_customer_id}
          </span>
        </div>
      ),
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
          <span className="text-gray-400 text-xs">Tarik Tunai</span>
        ),
    },
    {
      title: "Debit / Kredit",
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
          onClick={() => navigate(`/admin/transaksi/${id}/bukti`)}
        >
          Bukti
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Ringkasan transaksi dan aktivitas tabungan nasabah hari ini
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/transaksi/new">
            <Button variant="primary" size="md" icon={PlusCircle}>
              Catat Transaksi
            </Button>
          </Link>
          <Link to="/admin/nasabah/new">
            <Button variant="outline" size="md" icon={UserPlus}>
              Nasabah Baru
            </Button>
          </Link>
          <Link to="/admin/laporan">
            <Button variant="outline" size="md" icon={FileText}>
              Laporan
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Nasabah */}
        <Card className="border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Nasabah
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {data?.total_nasabah || 0}
            </span>
            <span className="text-xs text-gray-500 ml-1.5">
              ({data?.total_nasabah_active || 0} aktif)
            </span>
          </div>
        </Card>

        {/* Total Saldo Beredar */}
        <Card className="border-gray-200/80 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Saldo Nasabah
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700">
              {data?.total_balance_all_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">Total simpanan seluruh nasabah</p>
          </div>
        </Card>

        {/* Total Berat Sampah Terkumpul */}
        <Card className="border-gray-200/80 bg-gradient-to-br from-white to-teal-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Sampah Terkumpul
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-teal-700">
              {data?.total_weight_kg_formatted || "0,00 kg"}
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi seluruh setoran nasabah</p>
          </div>
        </Card>

        {/* Setoran Bulan Ini */}
        <Card className="border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Setoran Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {data?.total_setor_this_month_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi kredit bulan ini</p>
          </div>
        </Card>

        {/* Tarikan Bulan Ini */}
        <Card className="border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tarikan Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {data?.total_tarik_this_month_formatted || "Rp 0"}
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi debit bulan ini</p>
          </div>
        </Card>
      </div>

      {/* Distribution of Waste Weight by Category (Kg) */}
      <Card
        title="Distribusi Berat Sampah per Kategori"
        subtitle="Akumulasi berat dalam Kilogram (Kg) dan kontribusi per jenis kategori sampah"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Total Terkumpul: {data?.total_weight_kg_formatted || "0,00 kg"}
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
                      {cat.transaction_count} transaksi
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
                  <span>Nilai Transaksi:</span>
                  <span className="font-bold text-gray-800">{cat.total_amount_formatted}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            Belum ada transaksi penyetoran sampah yang tercatat.
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card
        title="Transaksi Terbaru"
        subtitle="5 aktivitas pencatatan transaksi tabungan terakhir"
        action={
          <Link
            to="/admin/transaksi"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Lihat Semua Transaksi <ChevronRight className="w-4 h-4" />
          </Link>
        }
      >
        <DataTable
          columns={columns}
          data={data?.recent_transactions || []}
          isLoading={isLoading}
          emptyMessage="Belum ada catatan transaksi nasabah."
        />
      </Card>
    </div>
  );
};
