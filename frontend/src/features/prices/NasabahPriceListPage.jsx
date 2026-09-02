import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, Calendar, Package, Layers, LayoutGrid, List, Tag, AlertCircle } from "lucide-react";
import { priceService } from "../../services/priceService";
import { categoryService } from "../../services/categoryService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DataTable } from "../../components/table/DataTable";
import { formatRupiah } from "../../utils/currency";
import { formatDate } from "../../utils/formatting";

export const NasabahPriceListPage = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Fetch active categories for dropdown filter
  const { data: categories } = useQuery({
    queryKey: ["nasabah-categories-filter"],
    queryFn: () => categoryService.listCategories({ is_active: true }),
  });

  // Fetch active price items from master price service
  const { data: pricesData, isLoading } = useQuery({
    queryKey: ["nasabah-active-prices", { search, category_id: categoryFilter }],
    queryFn: () =>
      priceService.listPrices({
        status: "ACTIVE",
        category_id: categoryFilter || undefined,
        search: search || undefined,
        page: 1,
        page_size: 100,
      }),
  });

  const priceItems = pricesData?.items || [];

  const tableColumns = [
    {
      title: "No",
      key: "no",
      width: "50px",
      align: "center",
      render: (_, __, index) => <span className="text-gray-500 font-medium">{index + 1}</span>,
    },
    {
      title: "Kategori Sampah",
      key: "category_name",
      render: (val) => (
        <span className="font-bold text-gray-900 block">{val || "-"}</span>
      ),
    },
    {
      title: "Kelompok",
      key: "group_name",
      render: (val, row) => (
        <div className="space-y-1">
          <span className="font-semibold text-emerald-900 block">{val || row.category_name}</span>
          {row.price_code && (
            <Badge variant="ACTIVE" className="text-[10px] font-mono">
              {row.price_code}
            </Badge>
          )}
        </div>
      ),
    },
    {
      title: "Contoh Barang / Produk",
      key: "example_items",
      render: (val) => (
        <div className="max-w-xs">
          {val ? (
            <span className="text-xs text-gray-600 line-clamp-2">{val}</span>
          ) : (
            <span className="text-xs text-gray-400 italic">-</span>
          )}
        </div>
      ),
    },
    {
      title: "Tanggal Berlaku",
      key: "effective_date",
      align: "center",
      render: (val) => (
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{formatDate(val)}</span>
        </div>
      ),
    },
    {
      title: "Harga Beli",
      key: "price_per_kg",
      align: "right",
      render: (val) => (
        <div className="text-right">
          <span className="text-sm font-black text-emerald-700 block">
            {formatRupiah(val)}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">/ kg</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Harga Sampah Aktif"
        subtitle="Daftar tarif beli sampah per kilogram yang saat ini berlaku di Bank Sampah Unit Villa Harmonis"
      />

      {/* Info Tip Card */}
      <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">Tips Penyetoran Sampah:</h4>
            <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
              Pastikan sampah sudah disortir sesuai kategori dan kelompoknya, dibersihkan dari sisa cairan/kotoran, serta dikeringkan dan dipadatkan sebelum disetor agar proses penimbangan lebih cepat dan nilai setoran optimal.
            </p>
          </div>
        </div>
      </Card>

      {/* Search & Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Cari kategori, kelompok, contoh barang..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select
              placeholder="Semua Kategori Sampah"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={
                categories?.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                })) || []
              }
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0">
            <span className="text-xs text-gray-400 font-medium mr-1 hidden sm:inline">Tampilan:</span>
            <Button
              variant={viewMode === "grid" ? "primary" : "outline"}
              size="sm"
              icon={LayoutGrid}
              onClick={() => setViewMode("grid")}
              title="Tampilan Kartu"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "primary" : "outline"}
              size="sm"
              icon={List}
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel"
            >
              Tabel
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Section */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-gray-500 font-medium mt-3">Memuat katalog harga sampah terkini...</p>
        </div>
      ) : priceItems.length === 0 ? (
        <EmptyState
          title="Harga Sampah Tidak Ditemukan"
          description="Tidak ada data harga sampah aktif yang cocok dengan kriteria pencarian Anda."
        />
      ) : viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={priceItems}
          isLoading={isLoading}
          emptyMessage="Belum ada harga sampah yang terdaftar."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {priceItems.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-lg transition-all duration-200 border-gray-200/90 flex flex-col justify-between overflow-hidden relative group hover:border-emerald-300"
            >
              <div>
                {/* Header Tag Kategori & Kode */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-600" />
                      {item.category_name}
                    </span>
                    {item.price_code && (
                      <Badge variant="ACTIVE" className="text-[10px] font-mono font-bold">
                        {item.price_code}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="ACTIVE" className="shrink-0 text-[10px]">
                    Aktif
                  </Badge>
                </div>

                {/* Kelompok / Nama Jenis */}
                <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  {item.group_name || item.category_name}
                </h3>

                {/* Contoh Barang / Produk */}
                {item.example_items ? (
                  <div className="mt-2.5 p-2.5 bg-gray-50/90 rounded-lg border border-gray-100/90">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Contoh Barang / Produk:</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-normal">
                      {item.example_items}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5 p-2 bg-gray-50/60 rounded-lg border border-dashed border-gray-200">
                    <p className="text-[11px] text-gray-400 italic">
                      Sampah sesuai kategori {item.category_name} dalam kondisi bersih & kering.
                    </p>
                  </div>
                )}

                {/* Tanggal Berlaku */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Berlaku sejak: <strong className="text-gray-700 font-semibold">{formatDate(item.effective_date)}</strong>
                  </span>
                </div>

                {/* Catatan jika ada */}
                {item.notes && item.notes !== "-" && (
                  <p className="text-[11px] text-gray-400 mt-2 italic line-clamp-2">
                    Catatan: {item.notes}
                  </p>
                )}
              </div>

              {/* Price Highlight Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between bg-gradient-to-r from-transparent to-emerald-50/30 -mx-6 -mb-6 px-6 py-3">
                <span className="text-xs text-gray-500 font-medium">Harga Beli:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-700 tracking-tight">
                    {formatRupiah(item.price_per_kg)}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 ml-1">/ kg</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
