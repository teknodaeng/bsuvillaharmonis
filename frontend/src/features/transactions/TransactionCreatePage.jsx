import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Save,
  CheckCircle,
  AlertTriangle,
  Printer,
  User,
} from "lucide-react";
import { nasabahService } from "../../services/nasabahService";
import { priceService } from "../../services/priceService";
import { transactionService } from "../../services/transactionService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { AutocompleteSelect } from "../../components/ui/AutocompleteSelect";
import { Textarea } from "../../components/ui/Textarea";
import { Alert } from "../../components/ui/Alert";
import { formatRupiah } from "../../utils/currency";
import { formatKg } from "../../utils/formatting";
import { useUIStore } from "../../stores/uiStore";

export const TransactionCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState("SETOR"); // 'SETOR' | 'TARIK'
  const [selectedNasabahId, setSelectedNasabahId] = useState(
    location.state?.nasabahId ? String(location.state.nasabahId) : ""
  );

  // SETOR States
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [setorNotes, setSetorNotes] = useState("");

  // TARIK States
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [tarikNotes, setTarikNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // Fetch Active Nasabah List for Select & Autocomplete
  const { data: nasabahList, isLoading: isNasabahLoading } = useQuery({
    queryKey: ["nasabah-active-list"],
    queryFn: () =>
      nasabahService.listNasabah({
        status: "ACTIVE",
        page_size: 200,
      }),
  });

  const nasabahOptions = useMemo(() => {
    if (!nasabahList) return [];
    const items = Array.isArray(nasabahList) ? nasabahList : nasabahList.items || [];
    return items.map((n) => {
      const region = [n.kelurahan, n.kecamatan].filter(Boolean).join(", ");
      return {
        label: `[${n.customer_id}] ${n.name}`,
        value: String(n.id),
        badge: n.customer_id,
        name: n.name,
        category: n.nasabah_category || "Rumah Tangga/Individu",
        subLabel: `NIK: ${n.nik} • HP: ${n.phone}${region ? ` • ${region}` : ""}`,
        rightBadge: formatRupiah(n.balance || 0),
        searchTerms: `${n.customer_id} ${n.name} ${n.nik} ${n.phone} ${n.nasabah_category || ""} ${n.address || ""} ${region}`,
      };
    });
  }, [nasabahList]);

  // Query All Master Harga Sampah Yang Aktif
  const { data: priceData, isLoading: isPricesLoading } = useQuery({
    queryKey: ["active-master-prices-list"],
    queryFn: () => priceService.listPrices({ status: "ACTIVE", page_size: 100 }),
  });

  // Filter only active price master records
  const activePrices = useMemo(() => {
    if (!priceData) return [];
    const items = Array.isArray(priceData) ? priceData : priceData.items || [];
    return items.filter(
      (p) =>
        String(p.status).toUpperCase() === "ACTIVE" &&
        (p.price_per_kg || 0) > 0
    );
  }, [priceData]);

  // Fetch Selected Nasabah Detail for Live Balance
  const { data: selectedNasabah } = useQuery({
    queryKey: ["nasabah-balance-check", selectedNasabahId],
    queryFn: () => nasabahService.getNasabahDetail(selectedNasabahId),
    enabled: !!selectedNasabahId,
  });

  // Selected Price Master Object
  const selectedPrice = activePrices.find(
    (p) => String(p.id) === selectedPriceId
  );
  const selectedCategoryId = selectedPrice?.category_id || "";
  const activePricePerKg = selectedPrice?.price_per_kg || 0;

  // Calculations for Setor
  const numericWeight = parseFloat(weightKg) || 0;
  const calculatedCredit = Math.round(numericWeight * activePricePerKg);
  const currentBalance = selectedNasabah?.balance || 0;
  const projectedBalanceSetor = currentBalance + calculatedCredit;

  // Calculations for Tarik
  const numericWithdraw = parseInt(withdrawAmount) || 0;
  const projectedBalanceTarik = currentBalance - numericWithdraw;
  const isWithdrawExceeded = numericWithdraw > currentBalance;

  // Automatically select first active price master if available
  useEffect(() => {
    if (activePrices.length > 0 && !selectedPriceId) {
      setSelectedPriceId(String(activePrices[0].id));
    }
  }, [activePrices, selectedPriceId]);

  const createTxMutation = useMutation({
    mutationFn: (payload) => transactionService.createTransaction(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-list"] });
      queryClient.invalidateQueries({ queryKey: ["nasabah-detail"] });

      addToast({
        title: "Transaksi Berhasil Dicatat",
        message: `No. Transaksi: ${data.transaction_no}`,
        type: "success",
      });

      // Redirect directly to the printable receipt
      navigate(`/admin/transaksi/${data.id}/bukti`);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Gagal mencatat transaksi.");
    },
  });

  const handleSetorSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedNasabahId) {
      setErrorMessage("Silakan pilih nasabah terlebih dahulu.");
      return;
    }
    if (!selectedPrice || !selectedCategoryId) {
      setErrorMessage("Silakan pilih kelompok sampah (harga sampah).");
      return;
    }
    if (numericWeight <= 0) {
      setErrorMessage("Berat sampah harus lebih besar dari 0 kg.");
      return;
    }
    if (activePricePerKg <= 0) {
      setErrorMessage("Kelompok harga sampah ini belum memiliki tarif aktif.");
      return;
    }

    createTxMutation.mutate({
      nasabah_id: String(selectedNasabahId),
      type: "SETOR",
      price_id: String(selectedPriceId),
      category_id: String(selectedCategoryId),
      weight_kg: numericWeight,
      notes: setorNotes || null,
    });
  };

  const handleTarikSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedNasabahId) {
      setErrorMessage("Silakan pilih nasabah terlebih dahulu.");
      return;
    }
    if (numericWithdraw <= 0) {
      setErrorMessage("Jumlah penarikan harus lebih besar dari Rp 0.");
      return;
    }
    if (isWithdrawExceeded) {
      setErrorMessage("Saldo tidak mencukupi untuk melakukan penarikan nominal tersebut.");
      return;
    }

    createTxMutation.mutate({
      nasabah_id: String(selectedNasabahId),
      type: "TARIK",
      amount: numericWithdraw,
      notes: tarikNotes || null,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Catat Transaksi Tabungan"
        subtitle="Formulir pencatatan setoran sampah dan penarikan saldo tunai nasabah"
        actions={
          <Link to="/admin/transaksi">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Kembali ke Daftar
            </Button>
          </Link>
        }
      />

      {errorMessage && (
        <Alert type="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {/* Select Nasabah Card */}
      <Card
        title="1. Pilih Nasabah"
        subtitle="Cari dan tentukan akun nasabah aktif yang melakukan transaksi"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-2">
            <AutocompleteSelect
              label="Pilih Nasabah Aktif"
              placeholder={
                isNasabahLoading
                  ? "Memuat daftar nasabah aktif..."
                  : nasabahOptions.length === 0
                  ? "Tidak ada nasabah aktif ditemukan"
                  : "Ketik nama, NIK, ID nasabah, no. HP, atau wilayah..."
              }
              listHeaderTitle="Daftar Nasabah Aktif"
              emptyMessage="Tidak ditemukan nasabah aktif yang cocok"
              value={selectedNasabahId}
              onChange={(val) => setSelectedNasabahId(val)}
              required
              helperText={
                nasabahOptions.length === 0 && !isNasabahLoading
                  ? "Tidak ada nasabah aktif ditemukan dalam sistem."
                  : selectedNasabah
                  ? `Terpilih: [${selectedNasabah.customer_id}] ${selectedNasabah.name} (${selectedNasabah.nasabah_category || "Rumah Tangga/Individu"})`
                  : undefined
              }
              options={nasabahOptions}
            />
          </div>

          {selectedNasabah ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Saldo Saat Ini
              </span>
              <span className="text-xl font-black text-emerald-700 block mt-0.5">
                {formatRupiah(selectedNasabah.balance)}
              </span>
              <div className="text-[11px] text-gray-600 mt-1 space-y-0.5">
                <p className="font-semibold text-gray-900 truncate">{selectedNasabah.name}</p>
                <p className="font-mono text-gray-500">{selectedNasabah.customer_id} | {selectedNasabah.nik}</p>
                <p className="text-gray-500">{selectedNasabah.phone}</p>
                {selectedNasabah.nasabah_category && (
                  <span className="inline-block bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px] mt-1">
                    {selectedNasabah.nasabah_category}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-400">
              Pilih nasabah di samping untuk melihat data & saldo
            </div>
          )}
        </div>
      </Card>

      {/* Tabs for SETOR vs TARIK */}
      <div className="flex rounded-xl bg-gray-200/70 p-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("SETOR");
            setErrorMessage("");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "SETOR"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>SETOR SAMPAH (KREDIT)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("TARIK");
            setErrorMessage("");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "TARIK"
              ? "bg-white text-rose-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>TARIK TUNAI (DEBIT)</span>
        </button>
      </div>

      {/* TAB 1: SETOR FORM */}
      {activeTab === "SETOR" && (
        <form onSubmit={handleSetorSubmit}>
          <Card
            title="2. Rincian Setor Sampah"
            subtitle="Pilih kelompok harga sampah yang aktif dan masukkan berat timbangan"
            bodyClassName="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AutocompleteSelect
                label="Kelompok Sampah(Harga Sampah)"
                placeholder={
                  isPricesLoading
                    ? "Memuat master harga sampah..."
                    : activePrices.length === 0
                    ? "Tidak ada master harga sampah yang aktif"
                    : "Ketik untuk cari kelompok / harga sampah..."
                }
                value={selectedPriceId}
                onChange={(val) => setSelectedPriceId(val)}
                required
                helperText={
                  activePrices.length === 0 && !isPricesLoading
                    ? "Belum ada master harga sampah yang aktif. Silakan tetapkan harga di Master Harga Sampah."
                    : selectedPrice?.example_items
                    ? `Contoh: ${selectedPrice.example_items}`
                    : undefined
                }
                options={
                  activePrices.map((p) => {
                    const groupPrefix = p.group_name ? `[${p.group_name}] ` : "";
                    const catName = p.category_name || "Sampah";
                    const formattedPrice = `${formatRupiah(p.price_per_kg)}/kg`;
                    return {
                      label: `${groupPrefix}${catName} (${formattedPrice})`,
                      value: String(p.id),
                      group: p.group_name || "",
                      name: catName,
                      code: p.price_code || "",
                      exampleItems: p.example_items || "",
                      price: p.price_per_kg,
                      formattedPrice,
                    };
                  })
                }
              />

              <Input
                label="Berat Timbangan (Kilogram / kg)"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="Contoh: 2.500 atau 0.850"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
                helperText="Dapat diisi hingga 3 desimal (contoh: 1.250 kg)"
              />
            </div>

            <Textarea
              label="Catatan Transaksi (Opsional)"
              placeholder="Catatan tambahan bila ada (misal: kondisi sampah sangat bersih)"
              value={setorNotes}
              onChange={(e) => setSetorNotes(e.target.value)}
              rows={2}
            />

            {/* Calculation Preview Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 mb-2">
                <Calculator className="w-4 h-4" />
                <span>Kalkulasi Otomatis Setoran</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Kelompok / Tarif:</span>
                  <p className="font-semibold text-gray-900 truncate">
                    {selectedPrice
                      ? `${selectedPrice.group_name ? `[${selectedPrice.group_name}] ` : ""}${selectedPrice.category_name}`
                      : "-"}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    {formatRupiah(activePricePerKg)} / kg
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Berat Diinput:</span>
                  <p className="font-semibold text-gray-900">
                    {formatKg(numericWeight)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Tambahan Saldo:</span>
                  <p className="font-extrabold text-emerald-700 text-sm">
                    +{formatRupiah(calculatedCredit)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Perkiraan Saldo Akhir:</span>
                  <p className="font-bold text-gray-900">
                    {formatRupiah(projectedBalanceSetor)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={createTxMutation.isPending}
                icon={Save}
              >
                Simpan & Terbitkan Bukti Transaksi
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* TAB 2: TARIK TUNAI FORM */}
      {activeTab === "TARIK" && (
        <form onSubmit={handleTarikSubmit}>
          <Card
            title="2. Rincian Penarikan Saldo Tunai"
            subtitle="Tentukan nominal uang tunai yang ditarik oleh nasabah"
            bodyClassName="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Jumlah Penarikan (Rp)"
                  type="number"
                  placeholder="Contoh: 50000"
                  min="1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  error={isWithdrawExceeded ? "Nominal melebihi saldo tabungan saat ini!" : undefined}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setWithdrawAmount(String(currentBalance))}
                  disabled={currentBalance <= 0}
                >
                  Tarik Semua ({formatRupiah(currentBalance)})
                </Button>
              </div>
            </div>

            <Textarea
              label="Catatan Penarikan (Opsional)"
              placeholder="Keterangan penarikan (misal: penarikan keperluan warga)"
              value={tarikNotes}
              onChange={(e) => setTarikNotes(e.target.value)}
              rows={2}
            />

            {/* Calculation Preview Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-900 mb-2">
                <Calculator className="w-4 h-4" />
                <span>Kalkulasi Saldo Penarikan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Saldo Awal:</span>
                  <p className="font-semibold text-gray-900">{formatRupiah(currentBalance)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Nominal Penarikan:</span>
                  <p className="font-extrabold text-rose-700 text-sm">
                    -{formatRupiah(numericWithdraw)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Sisa Saldo Akhir:</span>
                  <p
                    className={`font-bold ${
                      projectedBalanceTarik < 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatRupiah(projectedBalanceTarik)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="submit"
                variant="danger"
                size="lg"
                disabled={isWithdrawExceeded || numericWithdraw <= 0}
                isLoading={createTxMutation.isPending}
                icon={Save}
              >
                Konfirmasi & Simpan Penarikan
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
