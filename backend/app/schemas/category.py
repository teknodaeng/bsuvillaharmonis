from typing import Optional
from pydantic import BaseModel, Field


class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nama Kategori Sampah")
    description: Optional[str] = Field(None, max_length=500, description="Deskripsi singkat jenis sampah")


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class CategoryStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Status aktif kategori (True/False)")


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
