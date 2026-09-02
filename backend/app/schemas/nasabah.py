import re
from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class NasabahCreateRequest(BaseModel):
    nik: str = Field(..., description="16-digit NIK")
    name: str = Field(..., min_length=3, description="Nama Lengkap")
    phone: str = Field(..., min_length=8, description="Nomor HP")
    address: str = Field(..., min_length=5, description="Alamat Domisili")
    rt: Optional[str] = Field(None, description="RT")
    rw: Optional[str] = Field(None, description="RW")
    kelurahan: Optional[str] = Field(None, description="Kelurahan / Desa")
    kecamatan: Optional[str] = Field(None, description="Kecamatan")
    kabupaten_kota: Optional[str] = Field(None, description="Kabupaten / Kota")
    nasabah_category: Optional[str] = Field("Rumah Tangga/Individu", description="Kategori Nasabah: Rumah Tangga/Individu, Sekolah, Instansi")
    email: Optional[EmailStr] = Field(None, description="Email Nasabah")
    password: str = Field(..., min_length=8, description="Password Akun")
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


class NasabahUpdateRequest(BaseModel):
    nik: Optional[str] = Field(None, description="16-digit NIK")
    name: Optional[str] = Field(None, min_length=3)
    phone: Optional[str] = Field(None, min_length=8)
    address: Optional[str] = Field(None, min_length=5)
    rt: Optional[str] = None
    rw: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kabupaten_kota: Optional[str] = None
    nasabah_category: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("nik")
    @classmethod
    def validate_nik(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if not re.match(r"^\d{16}$", clean):
                raise ValueError("NIK harus berupa 16 digit angka.")
            return clean
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if not re.match(r"^[0-9+\-\s]{8,20}$", clean):
                raise ValueError("Format nomor HP tidak valid.")
            return clean
        return v


class NasabahStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|INACTIVE)$", description="Status nasabah: ACTIVE atau INACTIVE")


class NasabahResponse(BaseModel):
    id: str
    customer_id: str
    account_no: str
    nik: str
    name: str
    phone: str
    address: str
    rt: Optional[str] = None
    rw: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kabupaten_kota: Optional[str] = None
    nasabah_category: Optional[str] = "Rumah Tangga/Individu"
    email: Optional[str] = None
    status: str
    registration_source: str
    balance: Optional[int] = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class NasabahBalanceResponse(BaseModel):
    nasabah_id: str
    customer_id: str
    account_no: str
    name: str
    balance: int
