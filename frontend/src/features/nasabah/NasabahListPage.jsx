import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Eye,
  Power,
  PlusCircle,
  Users,
  UserCheck,
  UserX,
  Wallet,
  RotateCcw,
  X,
  Phone,
  MapPin,
} from "lucide-react";
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
import { useUIStore } from "../../stores/uiStore";

export const NasabahListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const hasActiveFilter = Boolean(search || statusFilter || categoryFilter);

  const handleResetFilter = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "nasabah-list",
      { search, status: statusFilter, category: categoryFilter, page, page_size: pageSize },
    ],
    queryFn: () =>
      nasabahService.listNasabah({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) => nasabahService.updateNasabahStatus(id, newStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nasabah-list"] });
      addToast({
        title: "Status Diperbarui",
        message: `Status nasabah berhasil diubah menjadi ${
          variables.newStatus === "ACTIVE" ? "Aktif" : "Nonaktif"
        }.`,
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

  const handleToggleStatus = (row) => {
    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const nextStatusText = nextStatus === "ACTIVE" ? "mengaktifkan kembali" : "menonaktifkan";
    const confirmMsg = `Yakin ingin ${nextStatusText} nasabah ${row.name} (${row.customer_id})?`;
    if (window.confirm(confirmMsg)) {
      toggleStatusMutation.mutate({ id: row.id, newStatus: nextStatus });
    }
  };

  const columns = [
    {
      title: "ID Nasabah",
      key: "customer_id",
      render: (val) => (
        <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
          {val}
        </span>
      ),
    },
    {
      title: "NIK",
      key: "nik",
      render: (val) => <span className="font-mono text-gray-700">{val}</span>,
    },
    {
      title: "Nama & Domisili",
      key: "name",
      render: (val, row) => (
        <div className="max-w-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 block">{val}</span>
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
              {row.nasabah_category || "Rumah Tangga/Individu"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">{row.address}</span>
            {(row.rt || row.rw) && (
              <span className="font-medium text-gray-600 shrink-0">
                • RT {row.rt || "-"}/RW {row.rw || "-"}
              </span>
            )}
            {row.kelurahan && (
              <span className="text-gray-400 shrink-0">• {row.kelurahan}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Kontak",
      key: "phone",
      render: (val, row) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 text-gray-700 font-mono">
            <Phone className="w-3 h-3 text-gray-400" />
            <span>{val || "-"}</span>
          </div>
          {row.email && (
            <span className="text-[11px] text-gray-400 block truncate max-w-[150px]">
              {row.email}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (val) => (
        <Badge variant={val}>
          {val === "ACTIVE" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      title: "Saldo Tabungan",
      key: "balance",
      align: "right",
      render: (val, row) => (
        <div className="text-right">
          <span
            className={`font-bold font-mono ${
              Number(val) > 0 ? "text-emerald-700" : "text-gray-900"
            }`}
          >
            {formatRupiah(val)}
          </span>
          <span className="text-[10px] text-gray-400 block">
            {row.transaction_count || 0} transaksi
          </span>
        </div>
      ),
    },
    {
      title: "Aksi",
      key: "id",
      align: "center",
      render: (id, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            icon={Eye}
            onClick={() => navigate(`/admin/nasabah/${id}`)}
            title="Lihat Detail Profil & Mutasi Nasabah"
          >
            Detail
          </Button>
         
          <Button
            variant={row.status === "ACTIVE" ? "danger" : "success"}
            size="xs"
            onClick={() => handleToggleStatus(row)}
            title={row.status === "ACTIVE" ? "Nonaktifkan Nasabah" : "Aktifkan Kembali Nasabah"}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Daftar Nasabah"
        subtitle="Kelola seluruh data nasabah dan saldo tabungan bank sampah"
        actions={
          <Link to="/admin/nasabah/new">
            <Button variant="primary" icon={UserPlus}>
              Registrasi Nasabah Baru
            </Button>
          </Link>
        }
      />

      {/* Summary Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Nasabah</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">
                {data?.summary?.total_all || data?.pagination?.total_items || 0}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Nasabah Aktif</p>
              <p className="text-xl font-black text-green-700 mt-0.5">
                {data?.summary?.total_active ?? "-"}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Nasabah Nonaktif</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">
                {data?.summary?.total_inactive ?? "-"}
              </p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Saldo Tabungan</p>
              <p className="text-lg font-black text-teal-800 mt-0.5 truncate max-w-[160px]">
                {formatRupiah(data?.summary?.total_balance || 0)}
              </p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Input
              placeholder="Cari nama, NIK, ID/Rekening, No. HP, alamat, RT/RW..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <Select
              placeholder="Semua Kategori"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "Rumah Tangga / Individu", value: "Rumah Tangga/Individu" },
                { label: "Sekolah", value: "Sekolah" },
                { label: "Instansi", value: "Instansi" },
              ]}
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex-1">
              <Select
                placeholder="Semua Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: "Aktif (ACTIVE)", value: "ACTIVE" },
                  { label: "Nonaktif (INACTIVE)", value: "INACTIVE" },
                ]}
              />
            </div>

            {hasActiveFilter && (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetFilter}
                title="Reset Semua Filter"
                className="shrink-0"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage={
          hasActiveFilter
            ? "Tidak ada nasabah yang cocok dengan pencarian atau filter yang dipilih."
            : "Belum ada data nasabah yang terdaftar."
        }
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
