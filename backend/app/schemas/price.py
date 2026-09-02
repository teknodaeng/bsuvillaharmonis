from typing import Optional
from pydantic import BaseModel, Field


class PriceCreateRequest(BaseModel):
    category_id: str = Field(..., description="ID Kategori Sampah")
    price_per_kg: int = Field(..., gt=0, description="Harga per kg (Rupiah, > 0)")
    price_code: Optional[str] = Field(None, max_length=50, description="Kode harga sampah spesifik")
    group_name: Optional[str] = Field(None, max_length=100, description="Nama kelompok sampah")
    example_items: Optional[str] = Field(None, max_length=500, description="Contoh barang/produk")
    effective_date: Optional[str] = Field(None, description="Tanggal berlaku format YYYY-MM-DD (default hari ini)")
    status: str = Field("ACTIVE", pattern="^(ACTIVE|INACTIVE)$", description="Status harga: ACTIVE atau INACTIVE")
    notes: Optional[str] = Field(None, max_length=500, description="Catatan penetapan harga")


class PriceUpdateRequest(BaseModel):
    category_id: Optional[str] = Field(None, description="ID Kategori Sampah")
    price_per_kg: Optional[int] = Field(None, gt=0)
    price_code: Optional[str] = Field(None, max_length=50)
    group_name: Optional[str] = Field(None, max_length=100)
    example_items: Optional[str] = Field(None, max_length=500)
    effective_date: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE)$")
    notes: Optional[str] = None


class PriceStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|INACTIVE)$")


class PriceResponse(BaseModel):
    id: str
    category_id: str
    category_code: Optional[str] = None
    category_name: Optional[str] = None
    price_per_kg: int
    price_code: Optional[str] = None
    group_name: Optional[str] = None
    example_items: Optional[str] = None
    unit: str = "kg"
    effective_date: str
    status: str
    notes: Optional[str] = None
    created_at: Optional[str] = None


class ActivePriceResponse(BaseModel):
    category_id: str
    category_code: Optional[str] = None
    category_name: str
    price_per_kg: int
    price_code: Optional[str] = None
    group_name: Optional[str] = None
    example_items: Optional[str] = None
    unit: str = "kg"
    effective_date: str
    status: str = "ACTIVE"
