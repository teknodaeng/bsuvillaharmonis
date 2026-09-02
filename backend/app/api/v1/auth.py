from fastapi import APIRouter, Depends, status
from app.core.deps import get_current_user
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
)
from app.services.auth_service import auth_service
from app.utils.responses import success_response

router = APIRouter(prefix="/auth", tags=["Autentikasi & Registrasi"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    """Self-registration calon nasabah baru."""
    result = auth_service.register(data)
    return success_response(
        data=result,
        message="Registrasi berhasil. Silakan login menggunakan ID Nasabah atau NIK Anda.",
        status_code=status.HTTP_201_CREATED
    )


@router.post("/login")
def login(data: LoginRequest):
    """Login nasabah atau admin menggunakan ID Nasabah, No Rekening, NIK, atau Username."""
    result = auth_service.login(data)
    return success_response(data=result, message="Login berhasil.")


@router.post("/refresh")
def refresh_token(data: RefreshTokenRequest):
    """Refresh token JWT access token."""
    result = auth_service.refresh_token(data.refresh_token)
    return success_response(data=result, message="Token berhasil diperbarui.")


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """Logout pengguna dan invalidasi sesi client-side."""
    return success_response(message="Logout berhasil.")


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Mendapatkan data profil pengguna yang sedang login."""
    return success_response(
        data={
            "id": current_user["id"],
            "username": current_user["username"],
            "role": current_user["role"],
            "is_active": bool(current_user.get("is_active", 1)),
            "nasabah": current_user.get("nasabah"),
        },
        message="Data pengguna berhasil dimuat."
    )


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Mengganti password akun pengguna."""
    auth_service.change_password(current_user["id"], data)
    return success_response(message="Password berhasil diubah.")
