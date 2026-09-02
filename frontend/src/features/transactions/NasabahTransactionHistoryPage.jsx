import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Printer, Filter } from "lucide-react";
import { nasabahService } from "../../services/nasabahService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/table/DataTable";
import { Pagination } from "../../components/table/Pagination";
import { formatRupiah } from "../../utils/currency";
import { formatDateTime, formatKg } from "../../utils/formatting";

export const NasabahTransactionHistoryPage = () => {
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: [
      "nasabah-my-transactions",
      {
        type: typeFilter,
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: pageSize,
      },
    ],
    queryFn: () =>
      nasabahService.getMyTransactions({
        type: typeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: pageSize,
      }),
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
            <span className="font-semibold text-gray-800">{row.category?.name || "-"}</span>
            <span className="block text-[11px] text-gray-400">
              {formatKg(row.weight_gram, true)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Penarikan Tunai</span>
        ),
    },
    {
      title: "Nominal",
      key: "amount",
      align: "right",
      render: (val, row) => (
        <span
          className={
            row.type === "SETOR"
              ? "font-extrabold text-emerald-700"
              : "font-extrabold text-rose-600"
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
      title: "Bukti",
      key: "id",
      align: "center",
      render: (id) => (
        <Button
          variant="outline"
          size="xs"
          icon={Printer}
          onClick={() => navigate(`/riwayat/${id}/bukti`)}
        >
          Cetak
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Transaksi Tabungan"
        subtitle="Daftar lengkap seluruh mutasi setor sampah dan penarikan saldo Anda"
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Select
              placeholder="Semua Jenis Mutasi"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "Setor Sampah (SETOR)", value: "SETOR" },
                { label: "Tarik Saldo Tunai (TARIK)", value: "TARIK" },
              ]}
            />
          </div>

          <div>
            <Input
              type="date"
              label="Dari Tanggal"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Input
              type="date"
              label="Sampai Tanggal"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage="Belum ada riwayat transaksi pada rentang filter ini."
      />

      <Pagination
        page={data?.pagination?.page || page}
        totalPages={data?.pagination?.total_pages || 1}
        totalItems={data?.pagination?.total_items || 0}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
      />
    </div>
  );
};
