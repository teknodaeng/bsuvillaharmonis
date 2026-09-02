import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  KeyRound,
  Save,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Lock,
  Wallet,
  Tag,
  AlertCircle,
} from "lucide-react";
import { nasabahService } from "../../services/nasabahService";
import { authService } from "../../services/authService";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { formatRupiah } from "../../utils/currency";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

const editProfileSchema = z.object({
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
  email: z
    .string()
    .email("Format email tidak valid.")
    .optional()
    .or(z.literal("")),
  address: z.string().min(5, "Alamat domisili minimal 5 karakter."),
  rt: z.string().optional().or(z.literal("")),
  rw: z.string().optional().or(z.literal("")),
  kelurahan: z.string().optional().or(z.literal("")),
  kecamatan: z.string().optional().or(z.literal("")),
  kabupaten_kota: z.string().optional().or(z.literal("")),
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Password saat ini wajib diisi."),
    new_password: z.string().min(8, "Password baru minimal 8 karakter."),
    confirm_password: z.string().min(8, "Konfirmasi password minimal 8 karakter."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirm_password"],
  });

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user, updateUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");

  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");

  // 1. Fetch Profile Data
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => nasabahService.getMyProfile(),
  });

  // 2. Profile Form Setup
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      nik: "",
      name: "",
      nasabah_category: "Rumah Tangga/Individu",
      phone: "",
      email: "",
      address: "",
      rt: "",
      rw: "",
      kelurahan: "",
      kecamatan: "",
      kabupaten_kota: "",
    },
  });

  // Populate profile form when data loads or when edit mode is toggled
  useEffect(() => {
    if (profile) {
      resetProfile({
        nik: profile.nik || "",
        name: profile.name || "",
        nasabah_category: profile.nasabah_category || "Rumah Tangga/Individu",
        phone: profile.phone || "",
        email: profile.email || "",
        address: profile.address || "",
        rt: profile.rt || "",
        rw: profile.rw || "",
        kelurahan: profile.kelurahan || "",
        kecamatan: profile.kecamatan || "",
        kabupaten_kota: profile.kabupaten_kota || "",
      });
    }
  }, [profile, resetProfile]);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: (payload) => nasabahService.updateMyProfile(payload),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["my-profile"], updatedData);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });

      // Synchronize with authStore user if present
      if (user && user.nasabah) {
        updateUser({
          ...user,
          name: updatedData.name,
          email: updatedData.email,
          phone: updatedData.phone,
          nasabah: {
            ...user.nasabah,
            ...updatedData,
          },
        });
      }

      setIsEditing(false);
      setProfileErrorMessage("");
      setProfileSuccessMessage("Data diri Anda berhasil diperbarui!");
      addToast({
        title: "Profil Berhasil Diperbarui",
        message: "Perubahan data diri Anda telah tersimpan dengan aman.",
        type: "success",
      });
    },
    onError: (err) => {
      setProfileErrorMessage(err.message || "Gagal memperbarui data diri.");
    },
  });

  const onSubmitProfile = (data) => {
    setProfileErrorMessage("");
    setProfileSuccessMessage("");
    updateProfileMutation.mutate({
      nik: data.nik,
      name: data.name,
      nasabah_category: data.nasabah_category,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      rt: data.rt || null,
      rw: data.rw || null,
      kelurahan: data.kelurahan || null,
      kecamatan: data.kecamatan || null,
      kabupaten_kota: data.kabupaten_kota || null,
    });
  };

  const handleCancelEdit = () => {
    if (profile) {
      resetProfile({
        nik: profile.nik || "",
        name: profile.name || "",
        nasabah_category: profile.nasabah_category || "Rumah Tangga/Individu",
        phone: profile.phone || "",
        email: profile.email || "",
        address: profile.address || "",
        rt: profile.rt || "",
        rw: profile.rw || "",
        kelurahan: profile.kelurahan || "",
        kecamatan: profile.kecamatan || "",
        kabupaten_kota: profile.kabupaten_kota || "",
      });
    }
    setProfileErrorMessage("");
    setIsEditing(false);
  };

  // 3. Password Form Setup
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmitPassword = async (data) => {
    setPasswordErrorMessage("");
    setPasswordSuccessMessage("");
    try {
      await authService.changePassword({
        old_password: data.current_password,
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });
      setPasswordSuccessMessage("Password Anda berhasil diperbarui!");
      resetPassword();
      addToast({
        title: "Password Berhasil Diubah",
        message: "Silakan gunakan password baru Anda untuk login berikutnya.",
        type: "success",
      });
    } catch (err) {
      setPasswordErrorMessage(err.message || "Gagal mengubah password.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Profil & Pengaturan Akun"
        subtitle="Kelola informasi data diri nasabah dan keamanan akun portal Anda"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details & Edit Card */}
        <Card
          title={isEditing ? "Edit Data Diri Nasabah" : "Data Diri Nasabah"}
          subtitle={
            isEditing
              ? "Perbarui informasi identitas dan domisili Anda"
              : "Informasi akun nasabah yang terdaftar pada sistem"
          }
          className="lg:col-span-2"
          action={
            !isEditing && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit3}
                onClick={() => {
                  setProfileSuccessMessage("");
                  setProfileErrorMessage("");
                  setIsEditing(true);
                }}
              >
                Ubah Data Diri
              </Button>
            )
          }
        >
          {profileSuccessMessage && (
            <Alert type="success" className="mb-4">
              {profileSuccessMessage}
            </Alert>
          )}

          {profileErrorMessage && (
            <Alert type="danger" className="mb-4">
              {profileErrorMessage}
            </Alert>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-500">
              Memuat data profil nasabah...
            </div>
          ) : isError || !profile ? (
            <div className="py-8 text-center text-xs text-red-500">
              Gagal memuat data profil. Silakan muat ulang halaman.
            </div>
          ) : isEditing ? (
            /* EDIT FORM MODE */
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4 pt-1">
              {/* Static ID Nasabah Notice */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-emerald-700 font-medium">ID Nasabah (Tetap / Tidak Dapat Diubah):</span>
                  <p className="font-mono font-bold text-emerald-900 text-sm mt-0.5">
                    {profile.customer_id}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">No. Rekening:</span>
                  <p className="font-mono font-semibold text-emerald-900 text-sm mt-0.5">
                    {profile.account_no}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="No. KTP / NIK"
                  placeholder="16 digit NIK sesuai KTP"
                  icon={User}
                  maxLength={16}
                  required
                  {...registerProfile("nik")}
                  error={profileErrors.nik?.message}
                />

                <Input
                  label="Nama Lengkap"
                  placeholder="Nama lengkap sesuai identitas KTP"
                  icon={User}
                  required
                  {...registerProfile("name")}
                  error={profileErrors.name?.message}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Kategori Nasabah"
                  required
                  options={[
                    { label: "Rumah Tangga / Individu", value: "Rumah Tangga/Individu" },
                    { label: "Sekolah", value: "Sekolah" },
                    { label: "Instansi", value: "Instansi" },
                  ]}
                  {...registerProfile("nasabah_category")}
                  error={profileErrors.nasabah_category?.message}
                />

                <Input
                  label="Nomor HP / WhatsApp"
                  placeholder="Contoh: 081234567890"
                  icon={Phone}
                  required
                  {...registerProfile("phone")}
                  error={profileErrors.phone?.message}
                />
              </div>

              <Input
                label="Email (Opsional)"
                type="email"
                placeholder="nasabah@example.com"
                icon={Mail}
                {...registerProfile("email")}
                error={profileErrors.email?.message}
              />

              <Textarea
                label="Alamat Domisili"
                placeholder="Jalan, No. Rumah, Blok/Gang"
                rows={2}
                required
                {...registerProfile("address")}
                error={profileErrors.address?.message}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="RT"
                  placeholder="Contoh: 001"
                  icon={MapPin}
                  {...registerProfile("rt")}
                  error={profileErrors.rt?.message}
                />
                <Input
                  label="RW"
                  placeholder="Contoh: 005"
                  icon={MapPin}
                  {...registerProfile("rw")}
                  error={profileErrors.rw?.message}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kelurahan / Desa"
                  placeholder="Nama Kelurahan"
                  icon={MapPin}
                  {...registerProfile("kelurahan")}
                  error={profileErrors.kelurahan?.message}
                />
                <Input
                  label="Kecamatan"
                  placeholder="Nama Kecamatan"
                  icon={MapPin}
                  {...registerProfile("kecamatan")}
                  error={profileErrors.kecamatan?.message}
                />
              </div>

              <Input
                label="Kabupaten / Kota"
                placeholder="Nama Kabupaten atau Kota"
                icon={MapPin}
                {...registerProfile("kabupaten_kota")}
                error={profileErrors.kabupaten_kota?.message}
              />

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={X}
                  onClick={handleCancelEdit}
                  disabled={updateProfileMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Save}
                  isLoading={updateProfileMutation.isPending}
                >
                  Simpan Perubahan Data
                </Button>
              </div>
            </form>
          ) : (
            /* VIEW DETAILS MODE */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">ID Nasabah:</span>
                  <p className="font-mono font-bold text-primary-700 text-sm mt-0.5">
                    {profile.customer_id}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">No. Rekening Tabungan:</span>
                  <p className="font-mono font-semibold text-gray-900 text-sm mt-0.5">
                    {profile.account_no}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Nama Lengkap:</span>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">
                    {profile.name}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Kategori Nasabah:</span>
                  <p className="font-medium mt-0.5">
                    <span className="inline-block bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      {profile.nasabah_category || "Rumah Tangga/Individu"}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">No. KTP / NIK:</span>
                  <p className="font-mono font-medium text-gray-700 text-sm mt-0.5">
                    {profile.nik}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Nomor HP / WhatsApp:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.phone}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Email:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.email || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Status Rekening:</span>
                  <div className="mt-1">
                    <Badge variant={profile.status}>{profile.status}</Badge>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-400 font-medium">Alamat Domisili:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5 leading-relaxed">
                    {profile.address}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">RT / RW:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.rt || profile.rw ? `RT ${profile.rt || "-"} / RW ${profile.rw || "-"}` : "-"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Kelurahan / Desa:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.kelurahan || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Kecamatan:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.kecamatan || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Kabupaten / Kota:</span>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">
                    {profile.kabupaten_kota || "-"}
                  </p>
                </div>
              </div>

              {/* Balance Highlight Banner */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Total Saldo Tabungan Anda
                  </span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5 font-mono">
                    {formatRupiah(profile.balance)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Change Password Card */}
        <Card
          title="Keamanan Akun"
          subtitle="Ubah kata sandi login Anda"
          className="lg:col-span-1 h-fit"
        >
          {passwordErrorMessage && (
            <Alert type="danger" className="mb-3">
              {passwordErrorMessage}
            </Alert>
          )}

          {passwordSuccessMessage && (
            <Alert type="success" className="mb-3">
              {passwordSuccessMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-3.5">
            <PasswordInput
              label="Password Saat Ini"
              placeholder="Ketik password lama"
              required
              {...registerPassword("current_password")}
              error={passwordErrors.current_password?.message}
            />

            <PasswordInput
              label="Password Baru"
              placeholder="Minimal 8 karakter"
              required
              {...registerPassword("new_password")}
              error={passwordErrors.new_password?.message}
            />

            <PasswordInput
              label="Ulangi Password Baru"
              placeholder="Ketik ulang password baru"
              required
              {...registerPassword("confirm_password")}
              error={passwordErrors.confirm_password?.message}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isPasswordSubmitting}
                className="w-full"
                icon={KeyRound}
              >
                Ubah Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
