import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, CheckCircle, Clock } from "lucide-react";
import { transactionService } from "../../services/transactionService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/currency";
import { formatDateTime, formatKg } from "../../utils/formatting";

export const TransactionDetailPage = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const { data: tx, isLoading } = useQuery({
    queryKey: ["transaction-detail", transactionId],
    queryFn: () => transactionService.getTransactionDetail(transactionId),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat detail transaksi...</div>;
  }

  if (!tx) {
    return <div className="p-8 text-center text-sm text-red-500">Transaksi tidak ditemukan.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Transaksi #${tx.transaction_no}`}
        subtitle={`Waktu: ${formatDateTime(tx.transaction_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/transaksi">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                Kembali
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => navigate(`/admin/transaksi/${tx.id}/bukti`)}
            >
              Cetak Bukti Transaksi
            </Button>
          </div>
        }
      />

      <Card className="shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div>
            <span className="text-xs text-gray-400 font-medium">Jenis Transaksi:</span>
            <div className="mt-1">
              <Badge variant={tx.type} size="lg">
                {tx.type === "SETOR" ? "Setor Sampah (Kredit)" : "Tarik Saldo Tunai (Debit)"}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 font-medium">Nominal:</span>
            <span
              className={`block text-xl font-extrabold ${
                tx.type === "SETOR" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {tx.type === "SETOR" ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
          <div>
            <span className="text-gray-400 font-medium">ID Nasabah:</span>
            <p className="font-mono font-bold text-primary-700 mt-0.5">
              {tx.nasabah_customer_id}
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Nama Nasabah:</span>
            <p className="font-semibold text-gray-900 mt-0.5">{tx.nasabah_name}</p>
          </div>

          {tx.type === "SETOR" && tx.items && tx.items.length > 0 ? (
            <div className="col-span-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-700 block mb-2">
                Rincian Sampah Disetor ({tx.items.length} Jenis):
              </span>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3 w-8 text-center">No</th>
                      <th className="py-2 px-3">Kelompok / Jenis Sampah</th>
                      <th className="py-2 px-3 text-right">Tarif / kg</th>
                      <th className="py-2 px-3 text-right">Berat</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tx.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3 text-center text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-gray-800">
                          {it.display_name || it.category_name || "-"}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600">
                          {formatRupiah(it.price_per_kg)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">
                          {formatKg(it.weight_gram, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50/50 font-bold border-t border-gray-200 text-gray-900">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-gray-700">Total Keseluruhan:</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">
                        {formatKg(tx.weight_gram, true)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-800">
                        {formatRupiah(tx.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : tx.type === "SETOR" ? (
            <>
              <div>
                <span className="text-gray-400 font-medium">Kelompok Sampah:</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {tx.category?.name || "-"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Berat Ditimbang:</span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {formatKg(tx.weight_gram, true)}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Tarif Satuan:</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {formatRupiah(tx.price_per_kg)} / kg
                </p>
              </div>
            </>
          ) : null}

          <div>
            <span className="text-gray-400 font-medium">Saldo Akhir Nasabah:</span>
            <p className="font-extrabold text-gray-900 text-sm mt-0.5">
              {formatRupiah(tx.balance_after)}
            </p>
          </div>

          <div className="col-span-2 pt-2 border-t border-gray-100">
            <span className="text-gray-400 font-medium">Catatan Petugas:</span>
            <p className="font-medium text-gray-700 mt-0.5">
              {tx.notes || "Tidak ada catatan."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
