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
  Plus,
  Trash2,
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

  // SETOR Multi-Items State
  const [setorItems, setSetorItems] = useState([
    { id: 1, price_id: "", weight_kg: "" },
  ]);
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

  const priceOptions = useMemo(() => {
    return activePrices.map((p) => {
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
    });
  }, [activePrices]);

  // Fetch Selected Nasabah Detail for Live Balance
  const { data: selectedNasabah } = useQuery({
    queryKey: ["nasabah-balance-check", selectedNasabahId],
    queryFn: () => nasabahService.getNasabahDetail(selectedNasabahId),
    enabled: !!selectedNasabahId,
  });

  // Automatically select first active price master if available
  useEffect(() => {
    if (activePrices.length > 0) {
      setSetorItems((prev) =>
        prev.map((item) =>
          item.price_id ? item : { ...item, price_id: String(activePrices[0].id) }
        )
      );
    }
  }, [activePrices]);

  // Multi-item handlers
  const handleAddItem = () => {
    const defaultPriceId = activePrices.length > 0 ? String(activePrices[0].id) : "";
    setSetorItems((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), price_id: defaultPriceId, weight_kg: "" },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (setorItems.length <= 1) return;
    setSetorItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id, field, value) => {
    setSetorItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Calculations for Setor
  const calculatedItems = useMemo(() => {
    return setorItems.map((it) => {
      const priceObj = activePrices.find((p) => String(p.id) === String(it.price_id));
      const rate = priceObj?.price_per_kg || 0;
      const weight = parseFloat(it.weight_kg) || 0;
      const subtotal = Math.round(weight * rate);
      return {
        ...it,
        priceObj,
        rate,
        weight,
        subtotal,
      };
    });
  }, [setorItems, activePrices]);

  const totalWeightKg = useMemo(
    () => calculatedItems.reduce((acc, it) => acc + it.weight, 0),
    [calculatedItems]
  );
  const totalCalculatedCredit = useMemo(
    () => calculatedItems.reduce((acc, it) => acc + it.subtotal, 0),
    [calculatedItems]
  );
  const currentBalance = selectedNasabah?.balance || 0;
  const projectedBalanceSetor = currentBalance + totalCalculatedCredit;

  // Calculations for Tarik
  const numericWithdraw = parseInt(withdrawAmount) || 0;
  const projectedBalanceTarik = currentBalance - numericWithdraw;
  const isWithdrawExceeded = numericWithdraw > currentBalance;

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
    if (setorItems.length === 0) {
      setErrorMessage("Minimal harus ada 1 jenis sampah yang disetor.");
      return;
    }

    for (let i = 0; i < setorItems.length; i++) {
      const it = setorItems[i];
      if (!it.price_id) {
        setErrorMessage(`Baris ke-${i + 1}: Silakan pilih kelompok & tarif sampah.`);
        return;
      }
      const w = parseFloat(it.weight_kg);
      if (isNaN(w) || w <= 0) {
        setErrorMessage(`Baris ke-${i + 1}: Berat sampah harus lebih besar dari 0 kg.`);
        return;
      }
    }

    createTxMutation.mutate({
      nasabah_id: String(selectedNasabahId),
      type: "SETOR",
      items: setorItems.map((it) => ({
        price_id: String(it.price_id),
        weight_kg: parseFloat(it.weight_kg),
      })),
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
            subtitle="Tambahkan satu atau lebih jenis sampah yang disetorkan oleh nasabah"
            bodyClassName="space-y-4"
          >
            {/* List of Setor Items */}
            <div className="space-y-3">
              {setorItems.map((item, index) => {
                const calculated = calculatedItems.find((c) => c.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-800">
                          Jenis Sampah #{index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {calculated && calculated.subtotal > 0 && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Subtotal: {formatRupiah(calculated.subtotal)}
                          </span>
                        )}
                        {setorItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus baris sampah ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AutocompleteSelect
                        label="Kelompok Sampah (Harga Sampah)"
                        placeholder={
                          isPricesLoading
                            ? "Memuat master harga..."
                            : priceOptions.length === 0
                            ? "Tidak ada master harga aktif"
                            : "Pilih / cari kelompok sampah..."
                        }
                        value={item.price_id}
                        onChange={(val) => handleUpdateItem(item.id, "price_id", val)}
                        required
                        helperText={
                          calculated?.priceObj?.example_items
                            ? `Contoh: ${calculated.priceObj.example_items}`
                            : undefined
                        }
                        options={priceOptions}
                      />

                      <div>
                        <Input
                          label="Berat Timbangan (Kilogram / kg)"
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="Contoh: 2.500 atau 0.850"
                          value={item.weight_kg}
                          onChange={(e) => handleUpdateItem(item.id, "weight_kg", e.target.value)}
                          required
                          helperText={
                            calculated?.rate
                              ? `Tarif: ${formatRupiah(calculated.rate)}/kg`
                              : "Dapat diisi hingga 3 desimal (contoh: 1.250 kg)"
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add More Items Button */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                icon={Plus}
                className="w-full sm:w-auto border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 font-semibold"
              >
                Tambah Jenis / Kelompok Sampah Lain
              </Button>
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
              <div className="flex items-center justify-between font-bold text-xs text-emerald-900 mb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span>Kalkulasi Otomatis Setoran</span>
                </div>
                {setorItems.length > 1 && (
                  <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-bold">
                    {setorItems.length} Kelompok Berbeda
                  </span>
                )}
              </div>

              {/* Mini breakdown table if multiple items */}
              {calculatedItems.length > 1 && (
                <div className="mb-3 bg-white/70 rounded-lg p-2.5 border border-emerald-200/60 overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-emerald-200/80 text-emerald-900 font-bold">
                        <th className="pb-1 w-6">#</th>
                        <th className="pb-1">Jenis Sampah</th>
                        <th className="pb-1 text-right">Tarif</th>
                        <th className="pb-1 text-right">Berat</th>
                        <th className="pb-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {calculatedItems.map((it, idx) => (
                        <tr key={it.id}>
                          <td className="py-1 text-gray-500">{idx + 1}</td>
                          <td className="py-1 font-semibold text-gray-800 truncate max-w-[160px]">
                            {it.priceObj?.category_name || "-"}
                          </td>
                          <td className="py-1 text-right text-gray-600">{formatRupiah(it.rate)}</td>
                          <td className="py-1 text-right font-mono text-gray-700">{formatKg(it.weight, false)}</td>
                          <td className="py-1 text-right font-bold text-emerald-700">{formatRupiah(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Rincian Jenis:</span>
                  <p className="font-semibold text-gray-900 truncate">
                    {calculatedItems.length} Jenis Sampah
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    {setorItems.length > 1 ? "Multi-Kelompok" : calculatedItems[0]?.priceObj?.category_name || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Total Berat:</span>
                  <p className="font-semibold text-gray-900">
                    {formatKg(totalWeightKg, false)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Tambahan Saldo:</span>
                  <p className="font-extrabold text-emerald-700 text-sm">
                    +{formatRupiah(totalCalculatedCredit)}
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
