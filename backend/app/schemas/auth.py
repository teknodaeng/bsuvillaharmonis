import re
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    nik: str = Field(..., description="16-digit Indonesian National Identity Number (NIK)")
    name: str = Field(..., min_length=3, description="Full legal name")
    phone: str = Field(..., min_length=8, description="Active mobile phone number")
    address: str = Field(..., min_length=5, description="Residential address")
    rt: Optional[str] = Field(None, description="RT")
    rw: Optional[str] = Field(None, description="RW")
    kelurahan: Optional[str] = Field(None, description="Kelurahan / Desa")
    kecamatan: Optional[str] = Field(None, description="Kecamatan")
    kabupaten_kota: Optional[str] = Field(None, description="Kabupaten / Kota")
    nasabah_category: Optional[str] = Field("Rumah Tangga/Individu", description="Kategori Nasabah: Rumah Tangga/Individu, Sekolah, Instansi")
    email: Optional[EmailStr] = Field(None, description="Optional email address")
    password: str = Field(..., min_length=8, description="Account password (min 8 characters)")
    terms_accepted: Optional[bool] = Field(None, description="Persetujuan Syarat & Pernyataan")

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{16}$", clean):
            raise ValueError("NIK harus berupa 16 digit angka.")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[0-9+\-\s]{8,20}$", clean):
            raise ValueError("Format nomor HP tidak valid.")
        return clean


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="ID Nasabah (bsuvhXXXX), No. Rekening, NIK, atau Username Admin")
    password: str = Field(..., min_length=1, description="Password akun")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid JWT refresh token")


class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = Field(None, min_length=1, description="Password saat ini")
    current_password: Optional[str] = Field(None, min_length=1, description="Password saat ini (alias)")
    new_password: str = Field(..., min_length=8, description="Password baru (minimal 8 karakter)")
    confirm_password: Optional[str] = Field(None, min_length=8, description="Konfirmasi password baru")

    @model_validator(mode="after")
    def check_passwords_match(self) -> "ChangePasswordRequest":
        actual_old = self.old_password or self.current_password
        if not actual_old:
            raise ValueError("Password saat ini (old_password) wajib diisi.")
        self.old_password = actual_old

        if self.confirm_password and self.new_password != self.confirm_password:
            raise ValueError("Konfirmasi password baru tidak cocok.")
        return self


class UserInfoResponse(BaseModel):
    id: str
    username: Optional[str] = None
    role: str
    is_active: bool = True
    nasabah: Optional[Dict[str, Any]] = None


class LoginDataResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserInfoResponse
