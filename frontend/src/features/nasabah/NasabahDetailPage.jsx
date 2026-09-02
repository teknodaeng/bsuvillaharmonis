import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  Wallet,
  History,
  PlusCircle,
  Edit2,
  Save,
  CheckCircle,
  Printer,
} from "lucide-react";
import { nasabahService } from "../../services/nasabahService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/table/DataTable";
import { Pagination } from "../../components/table/Pagination";
import { formatRupiah } from "../../utils/currency";
import { formatDateTime, formatKg } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const NasabahDetailPage = () => {
  const { nasabahId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState("profil");
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);

  // Form states for editing
  const [editNik, setEditNik] = useState("");
  const [editName, setEditName] = useState("");
  const [editNasabahCategory, setEditNasabahCategory] = useState("Rumah Tangga/Individu");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRt, setEditRt] = useState("");
  const [editRw, setEditRw] = useState("");
  const [editKelurahan, setEditKelurahan] = useState("");
  const [editKecamatan, setEditKecamatan] = useState("");
  const [editKabupatenKota, setEditKabupatenKota] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: nasabah, isLoading } = useQuery({
    queryKey: ["nasabah-detail", nasabahId],
    queryFn: async () => {
      const res = await nasabahService.getNasabahDetail(nasabahId);
      setEditNik(res.nik || "");
      setEditName(res.name);
      setEditNasabahCategory(res.nasabah_category || "Rumah Tangga/Individu");
      setEditPhone(res.phone);
      setEditAddress(res.address);
      setEditRt(res.rt || "");
      setEditRw(res.rw || "");
      setEditKelurahan(res.kelurahan || "");
      setEditKecamatan(res.kecamatan || "");
      setEditKabupatenKota(res.kabupaten_kota || "");
      setEditEmail(res.email || "");
      return res;
    },
  });

  const { data: transactionsData, isLoading: isTxLoading } = useQuery({
    queryKey: ["nasabah-txs", nasabahId, { page }],
    queryFn: () => nasabahService.getNasabahTransactions(nasabahId, { page, page_size: 15 }),
    enabled: activeTab === "riwayat",
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => nasabahService.updateNasabah(nasabahId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["nasabah-detail", nasabahId] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-list"] });
      setIsEditing(false);
      addToast({
        title: "Berhasil",
        message: "Data profil nasabah berhasil diperbarui.",
        type: "success",
      });
    },
    onError: (err) => {
      addToast({
        title: "Gagal Memperbarui",
        message: err.message,
        type: "danger",
      });
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      nik: editNik,
      name: editName,
      nasabah_category: editNasabahCategory,
      phone: editPhone,
      address: editAddress,
      rt: editRt || null,
      rw: editRw || null,
      kelurahan: editKelurahan || null,
      kecamatan: editKecamatan || null,
      kabupaten_kota: editKabupatenKota || null,
      email: editEmail || null,
    });
  };

  const txColumns = [
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
            <span className="font-medium">{row.category?.name || "-"}</span>
            <span className="block text-[11px] text-gray-400">
              {formatKg(row.weight_gram, true)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">Tarik Tunai</span>
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
      render: (val) => <span className="font-semibold">{formatRupiah(val)}</span>,
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

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat detail nasabah...</div>;
  }

  if (!nasabah) {
    return <div className="p-8 text-center text-sm text-red-500">Nasabah tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Nasabah: ${nasabah.name}`}
        subtitle={`ID: ${nasabah.customer_id} | NIK: ${nasabah.nik}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/nasabah">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                Kembali
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() =>
                navigate("/admin/transaksi/new", { state: { nasabahId: nasabah.id } })
              }
            >
              Catat Transaksi
            </Button>
          </div>
        }
      />

      {/* Saldo summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-white to-emerald-50/50 border-emerald-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Saldo Tabungan Saat Ini
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {formatRupiah(nasabah.balance)}
            </span>
            <Badge variant={nasabah.status}>{nasabah.status}</Badge>
          </div>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Nomor Rekening
          </span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-gray-900">
              {nasabah.account_no}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              Sumber: {nasabah.registration_source === "SELF" ? "Mandiri" : "Petugas Admin"}
            </span>
          </div>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Kontak Nasabah
          </span>
          <div className="mt-2">
            <span className="text-sm font-semibold text-gray-900 block">{nasabah.phone}</span>
            <span className="text-xs text-gray-400 truncate block">
              {nasabah.email || "Tidak ada email"}
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("profil")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === "profil"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Profil Lengkap
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === "riwayat"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Riwayat Transaksi
          </button>
        </nav>
      </div>

      {/* Tab 1: Profil */}
      {activeTab === "profil" && (
        <Card
          title="Data Diri Nasabah"
          subtitle="Informasi detail identitas dan tempat tinggal"
          action={
            !isEditing ? (
              <Button
                variant="outline"
                size="sm"
                icon={Edit2}
                onClick={() => setIsEditing(true)}
              >
                Edit Data
              </Button>
            ) : null
          }
        >
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="No. KTP / NIK"
                  value={editNik}
                  maxLength={16}
                  onChange={(e) => setEditNik(e.target.value)}
                  placeholder="16 digit NIK"
                  required
                />
                <Input
                  label="Nama Lengkap"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <Select
                label="Kategori Nasabah"
                value={editNasabahCategory}
                onChange={(e) => setEditNasabahCategory(e.target.value)}
                required
                placeholder={null}
                options={[
                  { label: "Rumah Tangga / Individu", value: "Rumah Tangga/Individu" },
                  { label: "Sekolah", value: "Sekolah" },
                  { label: "Instansi", value: "Instansi" },
                ]}
              />
              <Input
                label="Nomor HP"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
              <Textarea
                label="Alamat Tempat Tinggal"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={2}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="RT"
                  value={editRt}
                  onChange={(e) => setEditRt(e.target.value)}
                  placeholder="Contoh: 001"
                />
                <Input
                  label="RW"
                  value={editRw}
                  onChange={(e) => setEditRw(e.target.value)}
                  placeholder="Contoh: 005"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kelurahan / Desa"
                  value={editKelurahan}
                  onChange={(e) => setEditKelurahan(e.target.value)}
                  placeholder="Nama Kelurahan"
                />
                <Input
                  label="Kecamatan"
                  value={editKecamatan}
                  onChange={(e) => setEditKecamatan(e.target.value)}
                  placeholder="Nama Kecamatan"
                />
              </div>

              <Input
                label="Kabupaten / Kota"
                value={editKabupatenKota}
                onChange={(e) => setEditKabupatenKota(e.target.value)}
                placeholder="Nama Kabupaten / Kota"
              />

              <Input
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <div className="flex justify-end gap-2.5 pt-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateMutation.isPending}
                  icon={Save}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-gray-400 font-medium">Nomor KTP / NIK:</span>
                <p className="font-mono font-semibold text-gray-900 text-sm mt-0.5">
                  {nasabah.nik}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Nama Lengkap:</span>
                <p className="font-semibold text-gray-900 text-sm mt-0.5">
                  {nasabah.name}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Kategori Nasabah:</span>
                <p className="font-medium text-emerald-800 mt-0.5">
                  <span className="inline-block bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded border border-emerald-200">
                    {nasabah.nasabah_category || "Rumah Tangga/Individu"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Nomor Telepon / HP:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.phone}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Email:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.email || "-"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400 font-medium">Alamat Tempat Tinggal:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5 leading-relaxed">
                  {nasabah.address}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">RT / RW:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.rt || nasabah.rw ? `RT ${nasabah.rt || "-"} / RW ${nasabah.rw || "-"}` : "-"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Kelurahan / Desa:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.kelurahan || "-"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Kecamatan:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.kecamatan || "-"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Kabupaten / Kota:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {nasabah.kabupaten_kota || "-"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Tanggal Terdaftar:</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5">
                  {formatDateTime(nasabah.created_at)}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Status Akun:</span>
                <div className="mt-1">
                  <Badge variant={nasabah.status}>{nasabah.status}</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Riwayat Transaksi */}
      {activeTab === "riwayat" && (
        <Card
          title="Riwayat Transaksi Nasabah"
          subtitle="Daftar setoran sampah dan penarikan tunai yang pernah dilakukan"
        >
          <DataTable
            columns={txColumns}
            data={transactionsData?.items || []}
            isLoading={isTxLoading}
            emptyMessage="Nasabah ini belum memiliki riwayat transaksi."
          />
          <Pagination
            page={transactionsData?.pagination?.page || page}
            totalPages={transactionsData?.pagination?.total_pages || 1}
            totalItems={transactionsData?.pagination?.total_items || 0}
            pageSize={15}
            onPageChange={(p) => setPage(p)}
          />
        </Card>
      )}
    </div>
  );
};
