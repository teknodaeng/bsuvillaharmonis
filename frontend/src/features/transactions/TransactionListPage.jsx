import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Search, Printer, Eye, Filter } from "lucide-react";
import { transactionService } from "../../services/transactionService";
import { categoryService } from "../../services/categoryService";
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

export const TransactionListPage = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: categories } = useQuery({
    queryKey: ["master-categories-filter"],
    queryFn: () => categoryService.listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-transactions",
      {
        search,
        type: typeFilter,
        category_id: categoryFilter,
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: pageSize,
      },
    ],
    queryFn: () =>
      transactionService.listTransactions({
        search: search || undefined,
        type: typeFilter || undefined,
        category_id: categoryFilter ? String(categoryFilter) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const columns = [
    {
      title: "Tanggal & Jam",
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
          <span className="font-semibold text-gray-900 block">{row.nasabah_name}</span>
          <span className="text-[11px] text-gray-400 font-mono">
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
              {formatKg(row.weight_gram, true)} ({formatRupiah(row.price_per_kg)}/kg)
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Penarikan Tunai</span>
        ),
    },
    {
      title: "Debit / Kredit",
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
      title: "Aksi",
      key: "id",
      align: "center",
      render: (id) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            icon={Eye}
            onClick={() => navigate(`/admin/transaksi/${id}`)}
          >
            Detail
          </Button>
          <Button
            variant="outline"
            size="xs"
            icon={Printer}
            onClick={() => navigate(`/admin/transaksi/${id}/bukti`)}
          >
            Bukti
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pencatatan & Riwayat Transaksi"
        subtitle="Daftar seluruh transaksi setoran sampah dan penarikan saldo tabungan"
        actions={
          <Link to="/admin/transaksi/new">
            <Button variant="primary" icon={PlusCircle}>
              Catat Transaksi Baru
            </Button>
          </Link>
        }
      />

      {/* Filter Card */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Cari no. transaksi, nama nasabah, ID..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Select
              placeholder="Semua Jenis"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "Setor Sampah (SETOR)", value: "SETOR" },
                { label: "Tarik Tunai (TARIK)", value: "TARIK" },
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
        emptyMessage="Tidak ada transaksi yang cocok dengan kriteria filter."
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
