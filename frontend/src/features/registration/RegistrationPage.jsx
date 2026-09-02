import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UserCheck,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Mail,
  FileText,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Checkbox } from "../../components/ui/Checkbox";
import { Modal } from "../../components/ui/Modal";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { authService } from "../../services/authService";

const registrationSchema = z
  .object({
    nik: z
      .string()
      .min(16, "NIK harus 16 digit angka.")
      .max(16, "NIK harus 16 digit angka.")
      .regex(/^\d+$/, "NIK hanya boleh berisi angka."),
    name: z.string().min(3, "Nama lengkap minimal 3 karakter."),
    nasabah_category: z.string().min(1, "Kategori nasabah wajib dipilih."),
    phone: z
      .string()
      .min(8, "Nomor HP minimal 8 digit.")
      .regex(/^[0-9+\-\s]+$/, "Format nomor HP tidak valid."),
    address: z.string().min(5, "Alamat minimal 5 karakter."),
    rt: z.string().optional().or(z.literal("")),
    rw: z.string().optional().or(z.literal("")),
    kelurahan: z.string().optional().or(z.literal("")),
    kecamatan: z.string().optional().or(z.literal("")),
    kabupaten_kota: z.string().optional().or(z.literal("")),
    email: z
      .string()
      .email("Format email tidak valid.")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter."),
    terms_accepted: z.literal(true, {
      errorMap: () => ({
        message: "Syarat & Pernyataan wajib dicentang dan disetujui untuk mendaftar.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

export const RegistrationPage = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registeredNasabah, setRegisteredNasabah] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
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
      password: "",
      confirmPassword: "",
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
      const res = await authService.register(payload);
      const regNasabah = res?.data?.nasabah || res?.nasabah || res?.data;
      if (!regNasabah) {
        throw new Error(
          res?.message ||
            "Respon pendaftaran tidak valid. Pastikan variabel VITE_API_BASE_URL mengarah ke backend API yang aktif."
        );
      }
      setRegisteredNasabah(regNasabah);
    } catch (err) {
      setErrorMessage(err.message || "Pendaftaran gagal. Silakan periksa kembali data Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success view
  if (registeredNasabah) {
    return (
      <Card className="shadow-xl border-emerald-100 text-center py-8 px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">Pendaftaran Berhasil!</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Akun tabungan bank sampah Anda telah berhasil dibuat dalam sistem.
        </p>

        <div className="my-6 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            ID Nasabah & No. Rekening Anda
          </span>
          <span className="block text-2xl font-extrabold text-emerald-700 tracking-wider mt-1 select-all font-mono">
            {registeredNasabah.customer_id}
          </span>
          <p className="text-[11px] text-emerald-600 mt-1.5">
            Simpan nomor ID di atas. Anda dapat masuk menggunakan ID tersebut atau NIK Anda.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          icon={ArrowRight}
          onClick={() => navigate("/login")}
        >
          Masuk ke Akun Sekarang
        </Button>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-gray-100/80">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Pendaftaran Nasabah Baru</h2>
        <p className="text-xs text-gray-500 mt-1">
          Lengkapi data diri Anda untuk membuka tabungan bank sampah
        </p>
      </div>

      {errorMessage && (
        <Alert type="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Input
          label="No. KTP / NIK"
          placeholder="16 digit NIK pada KTP"
          icon={User}
          maxLength={16}
          required
          {...register("nik")}
          error={errors.nik?.message}
        />

        <Input
          label="Nama Lengkap"
          placeholder="Nama sesuai identitas KTP"
          icon={User}
          required
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
          label="Nomor HP / WhatsApp"
          placeholder="Contoh: 081234567890"
          icon={Phone}
          required
          {...register("phone")}
          error={errors.phone?.message}
        />

        <Textarea
          label="Alamat Domisili"
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
          placeholder="alamat.email@example.com"
          icon={Mail}
          {...register("email")}
          error={errors.email?.message}
        />

        <PasswordInput
          label="Password"
          placeholder="Minimal 8 karakter"
          required
          {...register("password")}
          error={errors.password?.message}
        />

        <PasswordInput
          label="Konfirmasi Password"
          placeholder="Ketik ulang password"
          required
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
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
              description={
                <div className="mt-1 text-xs text-gray-600 leading-relaxed">
                  Saya menyatakan bahwa data yang diisi adalah benar, serta menyetujui seluruh{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="font-semibold text-primary-600 hover:text-primary-700 underline focus:outline-none cursor-pointer"
                  >
                    Syarat & Ketentuan Operasional
                  </button>{" "}
                  Bank Sampah Unit (BSU) Villa Harmonis.
                </div>
              }
            />
          </div>
        </div>

        <div className="pt-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
            icon={UserPlus}
          >
            Daftar Sekarang
          </Button>
        </div>
      </form>

      {/* Modal Syarat & Pernyataan */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Syarat & Pernyataan Nasabah"
        subtitle="Ketentuan pembukaan rekening tabungan Bank Sampah Unit (BSU) Villa Harmonis"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              BSU Villa Harmonis - Kelola Sampah Jadi Berkah
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTermsModal(false)}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={ShieldCheck}
                onClick={() => {
                  setValue("terms_accepted", true, { shouldValidate: true });
                  setShowTermsModal(false);
                }}
              >
                Saya Mengerti & Setujui
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <div className="p-3 bg-primary-50/60 rounded-xl border border-primary-100 flex items-start gap-2.5">
            <Info className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <p className="text-primary-800">
              Dengan mendaftar sebagai nasabah, Anda turut berpartisipasi aktif dalam pelestarian lingkungan dan pengelolaan sampah terpadu di lingkungan Villa Harmonis.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">1. Kebenaran Data Identitas</h4>
              <p>
                Nasabah menyatakan bahwa seluruh data identitas (NIK, Nama Lengkap, Nomor HP/WhatsApp, Alamat Domisili RT/RW) yang diisikan adalah benar, sah, dan milik pribadi yang bersangkutan.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">2. Pemilahan & Kualitas Sampah</h4>
              <p>
                Sampah yang disetorkan ke bank sampah harus merupakan sampah terpilah (anorganik/daur ulang seperti plastik, kertas, kardus, logam, botol kaca), dalam keadaan bersih, kering, dan tidak bercampur dengan sampah organik atau limbah beracun B3.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">3. Penimbangan & Penentuan Tarif</h4>
              <p>
                Penimbangan dilakukan oleh Petugas Admin di lokasi bank sampah dengan timbangan resmi. Tarif harga per kilogram mengikuti Master Harga Sampah yang berlaku aktif pada saat transaksi dicatat.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">4. Rekening Tabungan & Penarikan Saldo</h4>
              <p>
                Hasil penjualan sampah akan otomatis dibukukan ke saldo rekening tabungan nasabah. Nasabah dapat melakukan penarikan saldo secara tunai melalui loket petugas sesuai ketentuan saldo yang tersedia.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">5. Keamanan Akun & Kerahasiaan Kata Sandi</h4>
              <p>
                Nasabah bertanggung jawab penuh atas keamanan akun dan kerahasiaan kata sandi portal nasabah yang digunakan untuk mengakses informasi saldo dan riwayat transaksi.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-600">
          Sudah punya akun nasabah?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Masuk di Sini
          </Link>
        </p>
      </div>
    </Card>
  );
};
