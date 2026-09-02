import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, UserPlus, CheckCircle2, User, Phone, MapPin, Mail, ShieldCheck } from "lucide-react";
import { nasabahService } from "../../services/nasabahService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Checkbox } from "../../components/ui/Checkbox";
import { Alert } from "../../components/ui/Alert";
import { useUIStore } from "../../stores/uiStore";

const createNasabahSchema = z.object({
  nik: z
    .string()
    .min(16, "NIK harus 16 digit angka.")
    .max(16, "NIK harus 16 digit angka.")
    .regex(/^\d+$/, "NIK hanya boleh angka."),
  name: z.string().min(3, "Nama minimal 3 karakter."),
  nasabah_category: z.string().min(1, "Kategori nasabah wajib dipilih."),
  phone: z.string().min(8, "Nomor HP minimal 8 digit."),
  address: z.string().min(5, "Alamat minimal 5 karakter."),
  rt: z.string().optional().or(z.literal("")),
  rw: z.string().optional().or(z.literal("")),
  kelurahan: z.string().optional().or(z.literal("")),
  kecamatan: z.string().optional().or(z.literal("")),
  kabupaten_kota: z.string().optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid.").optional().or(z.literal("")),
  password: z.string().min(8, "Password awal minimal 8 karakter."),
  terms_accepted: z.literal(true, {
    errorMap: () => ({
      message: "Syarat & Pernyataan wajib disetujui sebelum mendaftarkan nasabah.",
    }),
  }),
});

export const NasabahCreatePage = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdNasabah, setCreatedNasabah] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createNasabahSchema),
    defaultValues: {
      nik: "",
      name: "",
      nasabah_category: "Rumah Tangga/Individu",
      phone: "",
      address: "",
      rt: "",
      rw: "",
      kelurahan: "",
      kecamatan: "",
      kabupaten_kota: "",
      email: "",
      password: "Password123!",
      terms_accepted: false,
    },
  });

  const isTermsChecked = watch("terms_accepted");

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const payload = {
        nik: data.nik,
        name: data.name,
        nasabah_category: data.nasabah_category,
        phone: data.phone,
        address: data.address,
        rt: data.rt || null,
        rw: data.rw || null,
        kelurahan: data.kelurahan || null,
        kecamatan: data.kecamatan || null,
        kabupaten_kota: data.kabupaten_kota || null,
        email: data.email || null,
        password: data.password,
      };
      const result = await nasabahService.createNasabah(payload);
      setCreatedNasabah(result);
      addToast({
        title: "Nasabah Berhasil Didaftarkan",
        message: `ID Nasabah: ${result.customer_id}`,
        type: "success",
      });
    } catch (err) {
      setErrorMessage(err.message || "Gagal mendaftarkan nasabah.");
    } finally {
      setIsLoading(false);
    }
  };

  if (createdNasabah) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <Card className="text-center py-8 px-6 shadow-md border-emerald-200">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Nasabah Berhasil Didaftarkan!</h2>
          <p className="text-xs text-gray-500 mt-1">
            Data nasabah baru telah tersimpan dan siap melakukan transaksi.
          </p>

          <div className="my-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">ID / No. Rekening:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {createdNasabah.customer_id}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Nama Nasabah:</span>
              <span className="font-semibold text-gray-900">{createdNasabah.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Kategori Nasabah:</span>
              <span className="font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                {createdNasabah.nasabah_category || "Rumah Tangga/Individu"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">NIK:</span>
              <span className="font-mono text-gray-700">{createdNasabah.nik}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">No. HP:</span>
              <span className="text-gray-700">{createdNasabah.phone}</span>
            </div>
            {(createdNasabah.rt || createdNasabah.rw || createdNasabah.kelurahan || createdNasabah.kecamatan || createdNasabah.kabupaten_kota) && (
              <div className="flex justify-between text-xs border-t border-emerald-100 pt-2 mt-2">
                <span className="text-gray-500">Wilayah Domisili:</span>
                <span className="text-gray-700 font-medium text-right">
                  {[
                    createdNasabah.rt ? `RT ${createdNasabah.rt}` : null,
                    createdNasabah.rw ? `RW ${createdNasabah.rw}` : null,
                    createdNasabah.kelurahan ? `Kel. ${createdNasabah.kelurahan}` : null,
                    createdNasabah.kecamatan ? `Kec. ${createdNasabah.kecamatan}` : null,
                    createdNasabah.kabupaten_kota,
                  ].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/admin/nasabah")}
            >
              Kembali ke Daftar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate("/admin/transaksi/new", { state: { nasabahId: createdNasabah.id } })}
            >
              Catat Setoran Awal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Registrasi Nasabah Baru"
        subtitle="Daftarkan nasabah baru melalui loket operasional admin"
        actions={
          <Link to="/admin/nasabah">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Kembali
            </Button>
          </Link>
        }
      />

      <Card className="shadow-md">
        {errorMessage && (
          <Alert type="danger" className="mb-4">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="No. KTP / NIK"
            placeholder="16 digit NIK"
            maxLength={16}
            required
            icon={User}
            {...register("nik")}
            error={errors.nik?.message}
          />

          <Input
            label="Nama Lengkap"
            placeholder="Nama lengkap sesuai KTP"
            required
            icon={User}
            {...register("name")}
            error={errors.name?.message}
          />

          <Select
            label="Kategori Nasabah"
            required
            placeholder={null}
            options={[
              { label: "Rumah Tangga / Individu", value: "Rumah Tangga/Individu" },
              { label: "Sekolah", value: "Sekolah" },
              { label: "Instansi", value: "Instansi" },
            ]}
            {...register("nasabah_category")}
            error={errors.nasabah_category?.message}
          />

          <Input
            label="Nomor HP"
            placeholder="Contoh: 081234567890"
            required
            icon={Phone}
            {...register("phone")}
            error={errors.phone?.message}
          />

          <Textarea
            label="Alamat Tempat Tinggal"
            placeholder="Jalan, No. Rumah, Blok/Gang"
            rows={2}
            required
            {...register("address")}
            error={errors.address?.message}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="RT"
              placeholder="Contoh: 001"
              icon={MapPin}
              {...register("rt")}
              error={errors.rt?.message}
            />
            <Input
              label="RW"
              placeholder="Contoh: 005"
              icon={MapPin}
              {...register("rw")}
              error={errors.rw?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kelurahan / Desa"
              placeholder="Nama Kelurahan"
              icon={MapPin}
              {...register("kelurahan")}
              error={errors.kelurahan?.message}
            />
            <Input
              label="Kecamatan"
              placeholder="Nama Kecamatan"
              icon={MapPin}
              {...register("kecamatan")}
              error={errors.kecamatan?.message}
            />
          </div>

          <Input
            label="Kabupaten / Kota"
            placeholder="Nama Kabupaten atau Kota"
            icon={MapPin}
            {...register("kabupaten_kota")}
            error={errors.kabupaten_kota?.message}
          />

          <Input
            label="Email (Opsional)"
            type="email"
            placeholder="nasabah@example.com"
            icon={Mail}
            {...register("email")}
            error={errors.email?.message}
          />

          <PasswordInput
            label="Password Awal"
            placeholder="Password untuk login nasabah"
            required
            helperText="Default: Password123!"
            {...register("password")}
            error={errors.password?.message}
          />

          {/* Checkbox Syarat & Pernyataan */}
          <div className="pt-2 pb-1">
            <div
              className={`p-3.5 rounded-xl border transition-colors ${
                errors.terms_accepted
                  ? "bg-red-50/80 border-red-300 ring-1 ring-red-200"
                  : isTermsChecked
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <Checkbox
                id="terms_accepted"
                label="Syarat & Pernyataan"
                required
                {...register("terms_accepted")}
                error={errors.terms_accepted?.message}
                description="Nasabah telah menyatakan kebenaran data identitas serta menyetujui syarat, ketentuan operasional, dan tata tertib Bank Sampah Unit (BSU) Villa Harmonis."
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/admin/nasabah")}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              icon={UserPlus}
            >
              Simpan Nasabah
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
