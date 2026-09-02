from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.schemas.nasabah import NasabahResponse


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username unik akun")
    name: str = Field(..., min_length=1, max_length=150, description="Nama lengkap pengguna / petugas")
    password: str = Field(..., min_length=6, max_length=100, description="Kata sandi akun")
    role: Literal["ADMIN", "NASABAH"] = Field("ADMIN", description="Role pengguna: ADMIN (Petugas Admin) atau NASABAH")
    email: Optional[EmailStr] = Field(None, description="Email pengguna")
    phone: Optional[str] = Field(None, description="Nomor telepon / WhatsApp")
    status: Literal["ACTIVE", "INACTIVE"] = Field("ACTIVE", description="Status akun pengguna")


class UserUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[Literal["ADMIN", "NASABAH"]] = None
    status: Optional[Literal["ACTIVE", "INACTIVE"]] = None


class UserResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100, description="Kata sandi baru")


class UserStatusUpdateRequest(BaseModel):
    status: Literal["ACTIVE", "INACTIVE"] = Field(..., description="Status baru akun (ACTIVE/INACTIVE)")


class UserResponse(BaseModel):
    id: str
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    is_active: bool
    nasabah_id: Optional[str] = None
    nasabah: Optional[NasabahResponse] = None
    last_login_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
