import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Power, Trash2 } from "lucide-react";
import { categoryService } from "../../services/categoryService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { DataTable } from "../../components/table/DataTable";
import { Pagination } from "../../components/table/Pagination";
import { useUIStore } from "../../stores/uiStore";

export const CategoryListPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories", { search, page, page_size: pageSize }],
    queryFn: () =>
      categoryService.listCategories({
        search: search || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const categories = Array.isArray(data) ? data : data?.items || [];

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (selectedCategory) {
        return categoryService.updateCategory(selectedCategory.id, payload);
      }
      return categoryService.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setIsModalOpen(false);
      addToast({
        title: "Berhasil",
        message: selectedCategory
          ? "Kategori berhasil diperbarui."
          : "Kategori baru berhasil ditambahkan.",
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
    mutationFn: ({ id, is_active }) => categoryService.updateStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      addToast({
        title: "Status Diperbarui",
        message: "Status kategori berhasil diubah.",
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
    mutationFn: (id) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      addToast({
        title: "Berhasil",
        message: "Kategori sampah berhasil dihapus permanen.",
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
    setSelectedCategory(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setIsModalOpen(true);
  };

  const handleToggleStatus = (cat) => {
    const nextStatus = !cat.is_active;
    const confirmMsg = `Yakin ingin ${nextStatus ? "mengaktifkan" : "menonaktifkan"} kategori ${cat.name}?`;
    if (window.confirm(confirmMsg)) {
      toggleStatusMutation.mutate({ id: cat.id, is_active: nextStatus });
    }
  };

  const handleDelete = (cat) => {
    if (
      window.confirm(
        `PERINGATAN: Yakin ingin menghapus kategori "${cat.name}" secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.`
      )
    ) {
      deleteMutation.mutate(cat.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      description,
    });
  };

  const columns = [
    {
      title: "Nama Kategori Sampah",
      key: "name",
      render: (val, row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{val}</span>
          {row.description && (
            <span className="text-[11px] text-gray-400 mt-0.5 block">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "is_active",
      render: (active) => (
        <Badge variant={active ? "ACTIVE" : "INACTIVE"}>
          {active ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
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
            variant={row.is_active ? "danger" : "success"}
            size="xs"
            onClick={() => handleToggleStatus(row)}
            title={row.is_active ? "Nonaktifkan" : "Aktifkan"}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            size="xs"
            onClick={() => handleDelete(row)}
            title="Hapus Kategori"
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
        title="Master Kategori Sampah"
        subtitle="Kelola jenis dan kategori sampah yang diterima oleh bank sampah"
        actions={
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Tambah Kategori
          </Button>
        }
      />

      <Card className="mb-4">
        <Input
          placeholder="Cari berdasarkan nama kategori sampah..."
          icon={Search}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Card>

      <DataTable
        columns={columns}
        data={categories || []}
        isLoading={isLoading}
        emptyMessage="Belum ada kategori sampah yang terdaftar."
      />

      <Pagination
        page={data?.pagination?.page || page}
        totalPages={data?.pagination?.total_pages || 1}
        totalItems={data?.pagination?.total_items || categories.length}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
      />

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCategory ? "Edit Kategori Sampah" : "Tambah Kategori Sampah"}
        subtitle="Pastikan nama kategori sampah jelas dan mudah diidentifikasi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Kategori"
            placeholder="Contoh: Plastik PET (Botol Bening)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Textarea
            label="Deskripsi / Catatan Jenis Sampah"
            placeholder="Keterangan kondisi sampah yang diterima (misal: bersih, tanpa tutup, kering)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
              Simpan Kategori
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
