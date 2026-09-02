import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LogIn, User, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";

const loginSchema = z.object({
  identifier: z.string().min(1, "ID Nasabah / No. Rekening / NIK / Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await authService.login(data);
      const { user, access_token, refresh_token } = res.data;
      setAuth({ user, access_token, refresh_token });

      addToast({
        title: "Login Berhasil",
        message: `Selamat datang kembali, ${user.nasabah?.name || user.username}!`,
        type: "success",
      });

      const destination =
        location.state?.from?.pathname ||
        (user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || "Gagal masuk. Periksa kembali data login Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-gray-100/80">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Masuk ke Akun Anda</h2>
        <p className="text-xs text-gray-500 mt-1">
          Gunakan ID Nasabah, No. Rekening, NIK, atau Username Admin
        </p>
      </div>

      {errorMessage && (
        <Alert type="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="ID Nasabah / No. Rekening / NIK / Username"
          placeholder="Contoh: bsuvh0001 atau 3201123456780001"
          icon={User}
          required
          {...register("identifier")}
          error={errors.identifier?.message}
        />

        <PasswordInput
          label="Password"
          placeholder="Masukkan password Anda"
          required
          {...register("password")}
          error={errors.password?.message}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
            icon={LogIn}
          >
            Masuk Sekarang
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-600">
          Belum punya akun nasabah?{" "}
          <Link
            to="/registrasi"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Daftar Mandiri di Sini
          </Link>
        </p>
      </div>
    </Card>
  );
};
