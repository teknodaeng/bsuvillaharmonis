from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class TransactionCreateRequest(BaseModel):
    nasabah_id: str = Field(..., description="ID Nasabah penerima transaksi")
    transaction_date: Optional[str] = Field(None, description="ISO format datetime (default sekarang)")
    type: str = Field(..., pattern="^(SETOR|TARIK)$", description="Jenis Transaksi: SETOR atau TARIK")
    
    # Required for SETOR
    price_id: Optional[str] = Field(None, description="ID Master Harga Sampah yang dipilih (Kelompok Sampah)")
    category_id: Optional[str] = Field(None, description="ID Kategori sampah")
    weight_kg: Optional[float] = Field(None, gt=0, description="Berat sampah dalam kg (Wajib untuk SETOR, > 0)")
    
    # Required for TARIK
    amount: Optional[int] = Field(None, gt=0, description="Nominal tarik tunai dalam Rupiah (Wajib untuk TARIK, > 0)")
    
    notes: Optional[str] = Field(None, max_length=500, description="Catatan opsional")
    idempotency_key: Optional[str] = Field(None, max_length=100, description="Kunci idempotensi untuk mencegah duplikasi")

    @model_validator(mode="after")
    def validate_type_payload(self) -> "TransactionCreateRequest":
        if self.type == "SETOR":
            if not self.price_id and not self.category_id:
                raise ValueError("Kelompok sampah atau harga sampah wajib dipilih untuk transaksi SETOR.")
            if self.weight_kg is None or self.weight_kg <= 0:
                raise ValueError("Berat sampah (kg) wajib diisi dan lebih dari 0 untuk transaksi SETOR.")
        elif self.type == "TARIK":
            if self.amount is None or self.amount <= 0:
                raise ValueError("Jumlah penarikan (amount) wajib diisi dan lebih dari 0 untuk transaksi TARIK.")
            if self.category_id is not None:
                raise ValueError("Transaksi TARIK tidak boleh menyertakan kategori sampah.")
            if self.price_id is not None:
                raise ValueError("Transaksi TARIK tidak boleh menyertakan master harga sampah.")
            if self.weight_kg is not None:
                raise ValueError("Transaksi TARIK tidak boleh menyertakan berat sampah.")
        return self


class CategorySummary(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    group_name: Optional[str] = None
    price_code: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    transaction_no: str
    nasabah_id: str
    nasabah_name: Optional[str] = None
    nasabah_customer_id: Optional[str] = None
    nasabah_nik: Optional[str] = None
    transaction_date: str
    type: str
    price_id: Optional[str] = None
    category: Optional[CategorySummary] = None
    weight_kg: Optional[float] = None
    weight_gram: Optional[int] = None
    price_per_kg: Optional[int] = None
    amount: int
    debit: int
    credit: int
    balance_after: int
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    pagination: PaginationMeta
