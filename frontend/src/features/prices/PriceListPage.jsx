import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  Edit2,
  AlertCircle,
  Trash2,
  Power,
  History,
  Layers,
  Package,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
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
import { Spinner } from "../../components/ui/Spinner";
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

  // History modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPrice, setHistoryPrice] = useState(null);

  // Form states
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [priceCode, setPriceCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [exampleItems, setExampleItems] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [unit, setUnit] = useState("kg");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const { data: categoriesData } = useQuery({
    queryKey: ["master-categories-dropdown"],
    queryFn: () => categoryService.listCategories({ is_active: true, page_size: 100 }),
  });

  const categories = categoriesData?.items || (Array.isArray(categoriesData) ? categoriesData : []);

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

  // Query price histories for selected item
  const { data: priceHistories, isLoading: isLoadingHistories } = useQuery({
    queryKey: ["price-histories", historyPrice?.id],
    queryFn: () => priceService.getPriceHistories(historyPrice.id),
    enabled: !!historyPrice?.id && isHistoryModalOpen,
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
          : "Harga baru berhasil ditambahkan ke katalog master.",
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
    setUnit("kg");
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
    setUnit(price.unit || "kg");
    setEffectiveDate(price.effective_date);
    setNotes(price.notes || "");
    setIsModalOpen(true);
  };

  const handleOpenHistory = (price) => {
    setHistoryPrice(price);
    setIsHistoryModalOpen(true);
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
        `PERINGATAN: Yakin ingin menghapus harga untuk "${price.group_name || price.category_name}" secara permanen?`
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
      unit: unit || "kg",
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

  // KPI Calculations
  const totalCount = prices?.pagination?.total_items || 0;
  const activeCount = prices?.items?.filter((p) => p.status === "ACTIVE").length || 0;
  const categoriesCount = categories.length;
  const avgPrice =
    prices?.items && prices.items.length > 0
      ? Math.round(
          prices.items.reduce((acc, curr) => acc + (curr.price_per_kg || 0), 0) /
            prices.items.length
        )
      : 0;

  const columns = [
    {
      title: "Kategori & Info Spesifik",
      key: "category",
      render: (_, row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.category_name}</span>
          <div className="flex gap-1.5 items-center mt-1 flex-wrap">
            {row.price_code && (
              <Badge variant="ACTIVE" className="text-[10px] font-mono font-bold">
                {row.price_code}
              </Badge>
            )}
            {row.group_name && (
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {row.group_name}
              </span>
            )}
          </div>
          {row.example_items && (
            <span className="text-[11px] text-gray-500 block mt-1">
              Contoh: {row.example_items}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Tarif Beli",
      key: "price_per_kg",
      render: (val, row) => (
        <div>
          <span className="font-extrabold text-emerald-700 text-sm block">
            {formatRupiah(val)}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">/ {row.unit || "kg"}</span>
        </div>
      ),
    },
    {
      title: "Tanggal Berlaku",
      key: "effective_date",
      render: (val) => (
        <span className="text-xs text-gray-600 inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {formatDate(val)}
        </span>
      ),
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
      title: "Catatan",
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
            title="Ubah Harga"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="xs"
            icon={History}
            onClick={() => handleOpenHistory(row)}
            title="Riwayat Perubahan Harga"
          >
            Riwayat
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
    <div className="space-y-5">
      <PageHeader
        title="Master Harga Sampah"
        subtitle="Kelola tarif harga beli sampah per satuan untuk setiap kategori dan jenis sampah"
        actions={
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Tetapkan Harga Baru
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Total Jenis Sampah</span>
            <span className="text-xl font-bold text-gray-900">{totalCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Tarif Aktif</span>
            <span className="text-xl font-bold text-blue-700">{activeCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Kategori Sampah</span>
            <span className="text-xl font-bold text-purple-700">{categoriesCount}</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block">Rata-rata Tarif</span>
            <span className="text-lg font-bold text-amber-700">{formatRupiah(avgPrice)}</span>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              placeholder="Cari kategori, kelompok, kode, contoh..."
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
                categories.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                }))
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
        emptyMessage="Belum ada data master harga sampah yang sesuai dengan filter."
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
        subtitle={
          selectedPrice
            ? "Ubah data harga terpilih. Riwayat perubahan akan dicatat otomatis."
            : "Tetapkan harga baru untuk kelompok sampah terkait."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Kategori Sampah"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
            options={
              categories.map((c) => ({
                label: c.name,
                value: String(c.id),
              }))
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Kode Harga (Opsional)"
              placeholder="Contoh: PLAS-01, B01, K02"
              value={priceCode}
              onChange={(e) => setPriceCode(e.target.value)}
            />

            <Select
              label="Satuan Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={[
                { label: "Kilogram (kg)", value: "kg" },
                { label: "Pieces / Botol (pcs)", value: "pcs" },
                { label: "Liter (ltr)", value: "liter" },
                { label: "Lembar", value: "lembar" },
                { label: "Buah", value: "buah" },
              ]}
            />
          </div>

          <Input
            label="Kelompok / Nama Jenis (Opsional)"
            placeholder="Contoh: Plastik Bening, Kardus Box, Besi Tua"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <Input
            label="Contoh Barang / Produk (Opsional)"
            placeholder="Contoh: Botol Air Mineral, Gelas Plastik, Buku Bekas"
            value={exampleItems}
            onChange={(e) => setExampleItems(e.target.value)}
          />

          <Input
            label={`Tarif Beli per ${unit === "pcs" ? "Piece / Botol" : unit === "liter" ? "Liter" : "Kilogram"} (Rp)`}
            type="number"
            placeholder="Contoh: 3500"
            min={1}
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            required
            helperText={`Besaran nilai dalam Rupiah untuk 1 ${unit || "kg"} sampah`}
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
            placeholder="Contoh: Kenaikan harga pengepul / penyesuaian pasar pusat"
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

      {/* Modal Price History */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Riwayat Perubahan Harga"
        subtitle={
          historyPrice
            ? `Log histori perubahan tarif untuk "${historyPrice.group_name || historyPrice.category_name}" (${historyPrice.price_code || "-"})`
            : "Histori penyesuaian harga"
        }
      >
        <div className="space-y-3">
          {isLoadingHistories ? (
            <div className="py-8 text-center">
              <Spinner size="md" />
              <p className="text-xs text-gray-500 mt-2">Memuat riwayat perubahan harga...</p>
            </div>
          ) : !priceHistories || priceHistories.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              Belum ada catatan riwayat perubahan harga untuk jenis sampah ini.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {priceHistories.map((hist) => (
                <div key={hist.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {formatRupiah(hist.price_per_kg)}
                      </span>
                      <Badge variant={hist.action === "CREATE" ? "ACTIVE" : "warning"}>
                        {hist.action === "CREATE" ? "Dibuat" : "Penyesuaian"}
                      </Badge>
                      <Badge variant={hist.status}>
                        {hist.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    {hist.notes && (
                      <p className="text-gray-600 mt-1 italic">"{hist.notes}"</p>
                    )}
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Oleh: {hist.creator_name || "Admin"} • Berlaku: {formatDate(hist.effective_date)}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {formatDate(hist.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
