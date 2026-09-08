import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import clsx from "clsx";
import { LogIn, User } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { ProgressBar } from "../../components/ui/ProgressBar";
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
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageProgress, setPageProgress] = useState(20);

  useEffect(() => {
    // Progress bar animation saat memuat halaman login
    const step1 = setTimeout(() => setPageProgress(55), 100);
    const step2 = setTimeout(() => setPageProgress(88), 240);
    const step3 = setTimeout(() => setPageProgress(100), 420);
    const finish = setTimeout(() => setIsPageLoading(false), 700);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(finish);
    };
  }, []);

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
      const authData = res?.data || res;
      const user = authData?.user;
      const access_token = authData?.access_token;
      const refresh_token = authData?.refresh_token;

      if (!user || !access_token) {
        throw new Error(
          res?.message ||
            "Respon autentikasi tidak valid. Pastikan variabel VITE_API_BASE_URL mengarah ke backend API yang aktif."
        );
      }

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
    <>
      {/* Top of Viewport Loading Bar */}
      {(isPageLoading || isLoading) && (
        <ProgressBar
          fixedTop
          indeterminate={isLoading}
          progress={isLoading ? 85 : pageProgress}
          className={clsx(
            "transition-opacity duration-300",
            !isLoading && pageProgress === 100 && "opacity-0"
          )}
        />
      )}

      <Card className="relative overflow-hidden shadow-xl border-gray-100/80">
        {/* Card Header Top Progress Indicator */}
        {(isPageLoading || isLoading) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-100/40 overflow-hidden z-20">
            <div
              className={clsx(
                "h-full bg-gradient-to-r from-emerald-500 via-primary-500 to-teal-400 transition-all duration-300 ease-out",
                isLoading && "animate-progress-indeterminate w-full"
              )}
              style={{
                width: isLoading ? undefined : `${pageProgress}%`,
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.7)",
              }}
            />
          </div>
        )}

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
    </>
  );
};
