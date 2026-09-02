import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, DollarSign, Calendar, Edit2, AlertCircle, Trash2, Power } from "lucide-react";
import { priceService } from "../../services/priceService";
import { categoryService } from "../../services/categoryService";
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
import { formatDate } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const PriceListPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);

  // Form states
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [priceCode, setPriceCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [exampleItems, setExampleItems] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["master-categories-dropdown"],
    queryFn: () => categoryService.listCategories({ is_active: true }),
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: [
      "master-prices",
      { category_id: categoryFilter, status: statusFilter, search, page, page_size: pageSize },
    ],
    queryFn: () =>
      priceService.listPrices({
        category_id: categoryFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (selectedPrice) {
        return priceService.updatePrice(selectedPrice.id, payload);
      }
      return priceService.createPrice(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-prices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-active-prices"] });
      setIsModalOpen(false);
      addToast({
        title: "Berhasil",
        message: selectedPrice
          ? "Harga berhasil diperbarui."
          : "Harga aktif baru berhasil ditetapkan untuk kategori terkait.",
        type: "success",
      });
    },
    onError: (err) => {
      addToast({
        title: "Gagal Menyimpan",
        message: err.message,
        type: "danger",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => priceService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["master-prices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-active-prices"] });
      addToast({
        title: "Status Diperbarui",
        message: `Status harga berhasil diubah menjadi ${variables.status === "ACTIVE" ? "Aktif" : "Nonaktif"}.`,
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

  const deleteMutation = useMutation({
    mutationFn: (id) => priceService.deletePrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-prices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-active-prices"] });
      addToast({
        title: "Berhasil",
        message: "Harga sampah berhasil dihapus permanen.",
        type: "success",
      });
    },
    onError: (err) => {
      addToast({
        title: "Gagal Menghapus",
        message: err.message,
        type: "danger",
      });
    },
  });

  const handleOpenCreate = () => {
    setSelectedPrice(null);
    setSelectedCategoryId(categories?.[0]?.id ? String(categories[0].id) : "");
    setPriceCode("");
    setGroupName("");
    setExampleItems("");
    setPricePerKg("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (price) => {
    setSelectedPrice(price);
    setSelectedCategoryId(String(price.category_id));
    setPriceCode(price.price_code || "");
    setGroupName(price.group_name || "");
    setExampleItems(price.example_items || "");
    setPricePerKg(price.price_per_kg);
    setEffectiveDate(price.effective_date);
    setNotes(price.notes || "");
    setIsModalOpen(true);
  };

  const handleToggleStatus = (price) => {
    const nextStatus = price.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmMsg =
      nextStatus === "ACTIVE"
        ? `Yakin ingin mengaktifkan harga untuk "${price.group_name || price.category_name}"?`
        : `Yakin ingin menonaktifkan harga untuk "${price.group_name || price.category_name}"?`;

    if (window.confirm(confirmMsg)) {
      toggleStatusMutation.mutate({ id: price.id, status: nextStatus });
    }
  };

  const handleDelete = (price) => {
    if (
      window.confirm(
        `PERINGATAN: Yakin ingin menghapus harga untuk kategori "${price.category_name}" secara permanen?`
      )
    ) {
      deleteMutation.mutate(price.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      category_id: String(selectedCategoryId),
      price_code: priceCode || null,
      group_name: groupName || null,
      example_items: exampleItems || null,
      price_per_kg: Number(pricePerKg),
      effective_date: effectiveDate,
      notes,
    };
    if (selectedPrice) {
      payload.status = selectedPrice.status;
    } else {
      payload.status = "ACTIVE"; // default for new price
    }
    saveMutation.mutate(payload);
  };

  const columns = [
    {
      title: "Kategori & Info Spesifik",
      key: "category",
      render: (_, row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.category_name}</span>
          <div className="flex gap-1.5 items-center mt-1 flex-wrap">
            {row.price_code && (
              <Badge variant="ACTIVE" className="text-[10px] font-mono">
                {row.price_code}
              </Badge>
            )}
            {row.group_name && (
              <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm">
                {row.group_name}
              </span>
            )}
          </div>
          {row.example_items && (
             <span className="text-[11px] text-gray-400 block mt-1">
               Contoh: {row.example_items}
             </span>
          )}
        </div>
      ),
    },
    {
      title: "Harga / kg",
      key: "price_per_kg",
      render: (val) => (
        <span className="font-extrabold text-emerald-700 text-sm">
          {formatRupiah(val)}
        </span>
      ),
    },
    {
      title: "Tanggal Berlaku",
      key: "effective_date",
      render: (val) => formatDate(val),
    },
    {
      title: "Status",
      key: "status",
      render: (status) => (
        <Badge variant={status}>
          {status === "ACTIVE" ? "Aktif" : "Nonaktif / Kadaluarsa"}
        </Badge>
      ),
    },
    {
      title: "Catatan / Keterangan",
      key: "notes",
      render: (notes) => <span className="text-xs text-gray-500">{notes || "-"}</span>,
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
            icon={Edit2}
            onClick={() => handleOpenEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant={row.status === "ACTIVE" ? "danger" : "success"}
            size="xs"
            onClick={() => handleToggleStatus(row)}
            title={row.status === "ACTIVE" ? "Nonaktifkan Harga" : "Aktifkan Harga"}
            disabled={toggleStatusMutation.isPending}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            size="xs"
            onClick={() => handleDelete(row)}
            title="Hapus Harga"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Master Harga Sampah"
        subtitle="Kelola tarif harga beli sampah per kilogram untuk setiap kategori"
        actions={
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Tetapkan Harga Baru
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              placeholder="Cari kategori, kelompok, contoh..."
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
              placeholder="Semua Kategori Sampah"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              options={
                categories?.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                })) || []
              }
            />
          </div>
          <div>
            <Select
              placeholder="Semua Status Harga"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: "Aktif (ACTIVE)", value: "ACTIVE" },
                { label: "Nonaktif / Kadaluarsa (INACTIVE)", value: "INACTIVE" },
              ]}
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={prices?.items || []}
        isLoading={isLoading}
        emptyMessage="Belum ada riwayat master harga sampah."
      />

      <Pagination
        page={prices?.pagination?.page || page}
        totalPages={prices?.pagination?.total_pages || 1}
        totalItems={prices?.pagination?.total_items || 0}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
      />

      {/* Modal Add/Edit Price */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPrice ? "Edit Harga Sampah" : "Tetapkan Harga Sampah Baru"}
        subtitle={selectedPrice ? "Ubah data harga terpilih." : "Tetapkan harga baru untuk kelompok sampah terkait."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Kategori Sampah"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
            options={
              categories?.map((c) => ({
                label: c.name,
                value: String(c.id),
              })) || []
            }
          />

          <Input
            label="Kode Harga Sampah (Opsional)"
            placeholder="Contoh: PL-01"
            value={priceCode}
            onChange={(e) => setPriceCode(e.target.value)}
          />

          <Input
            label="Kelompok (Opsional)"
            placeholder="Contoh: Plastik Bening"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <Input
            label="Contoh Barang/Produk (Opsional)"
            placeholder="Contoh: Botol Air Mineral, Gelas Plastik"
            value={exampleItems}
            onChange={(e) => setExampleItems(e.target.value)}
          />

          <Input
            label="Harga per Kilogram (Rp)"
            type="number"
            placeholder="Contoh: 3500"
            min={1}
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            required
            helperText="Nilai dalam Rupiah untuk 1 kg sampah"
          />

          <Input
            label="Tanggal Berlaku"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />

          <Textarea
            label="Catatan / Alasan Penyesuaian Harga"
            placeholder="Contoh: Kenaikan harga pengepul / penyesuaian pasar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saveMutation.isPending}
            >
              Simpan & Aktifkan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
