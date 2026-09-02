import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, Eye, Power, CheckCircle, XCircle } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["nasabah-list", { search, status: statusFilter, page, page_size: pageSize }],
    queryFn: () =>
      nasabahService.listNasabah({
        search: search || undefined,
        status: statusFilter || undefined,
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
        message: `Status nasabah berhasil diubah menjadi ${variables.newStatus}.`,
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
    const confirmMsg = `Yakin ingin mengubah status nasabah ${row.name} menjadi ${nextStatus}?`;
    if (window.confirm(confirmMsg)) {
      toggleStatusMutation.mutate({ id: row.id, newStatus: nextStatus });
    }
  };

  const columns = [
    {
      title: "ID Nasabah",
      key: "customer_id",
      render: (val) => <span className="font-mono font-bold text-primary-700">{val}</span>,
    },
    {
      title: "NIK",
      key: "nik",
      render: (val) => <span className="font-mono text-gray-600">{val}</span>,
    },
    {
      title: "Nama Lengkap",
      key: "name",
      render: (val, row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{val}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
              {row.nasabah_category || "Rumah Tangga/Individu"}
            </span>
            <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{row.address}</span>
          </div>
        </div>
      ),
    },
    {
      title: "No. HP",
      key: "phone",
      render: (val) => <span className="text-gray-600">{val}</span>,
    },
    {
      title: "Status",
      key: "status",
      render: (val) => (
        <Badge variant={val}>
          {val === "ACTIVE" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      title: "Saldo Terakhir",
      key: "balance",
      align: "right",
      render: (val) => (
        <span className="font-bold text-gray-900">{formatRupiah(val)}</span>
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
          >
            Detail
          </Button>
          <Button
            variant={row.status === "ACTIVE" ? "danger" : "success"}
            size="xs"
            onClick={() => handleToggleStatus(row)}
            title={row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
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

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Cari berdasarkan nama, NIK, ID Nasabah, atau No. HP..."
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
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage="Tidak ada nasabah yang cocok dengan pencarian."
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
