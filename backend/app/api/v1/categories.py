from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.deps import require_admin
from app.schemas.category import (
    CategoryCreateRequest,
    CategoryStatusRequest,
    CategoryUpdateRequest,
)
from app.services.category_service import category_service
from app.utils.responses import success_response

router = APIRouter(tags=["Master Kategori Sampah"])


@router.get("/master/categories")
def list_categories(
    active_only: bool = Query(False, description="Tampilkan hanya kategori aktif"),
    is_active: Optional[bool] = Query(None, description="Alias untuk active_only"),
    has_active_price: bool = Query(False, description="Tampilkan hanya kategori yang memiliki harga aktif"),
    search: Optional[str] = Query(None, description="Pencarian nama kategori"),
    page: Optional[int] = Query(None, ge=1, description="Halaman"),
    page_size: Optional[int] = Query(None, ge=1, le=1000, description="Jumlah item per halaman"),
):
    """Daftar master kategori sampah beserta harga aktifnya (mendukung pagination opsional)."""
    effective_active_only = active_only or (is_active is True)
    if page is not None:
        effective_page_size = page_size or 20
        items, total_items = category_service.list_categories_paginated(
            active_only=effective_active_only,
            search=search,
            page=page,
            page_size=effective_page_size,
        )
        total_pages = (total_items + effective_page_size - 1) // effective_page_size if total_items > 0 else 0
        return success_response(
            data={
                "items": items,
                "pagination": {
                    "page": page,
                    "page_size": effective_page_size,
                    "total_items": total_items,
                    "total_pages": total_pages,
                },
            }
        )

    categories = category_service.list_categories(
        active_only=effective_active_only,
        search=search,
        has_active_price=has_active_price,
    )
    return success_response(data=categories)


@router.post("/admin/master/categories", status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreateRequest, admin_user: dict = Depends(require_admin)):
    """Tambah kategori sampah baru (Admin)."""
    category = category_service.create_category(data, creator_id=admin_user["id"])
    return success_response(
        data=category,
        message="Kategori sampah berhasil ditambahkan.",
        status_code=status.HTTP_201_CREATED
    )


@router.put("/admin/master/categories/{category_id}")
def update_category(
    category_id: str, data: CategoryUpdateRequest, admin_user: dict = Depends(require_admin)
):
    """Ubah informasi kategori sampah (Admin)."""
    category = category_service.update_category(category_id, data, updater_id=admin_user["id"])
    return success_response(data=category, message="Kategori sampah berhasil diperbarui.")


@router.patch("/admin/master/categories/{category_id}/status")
def update_category_status(
    category_id: str, data: CategoryStatusRequest, admin_user: dict = Depends(require_admin)
):
    """Ubah status aktif/nonaktif kategori sampah (Admin)."""
    category = category_service.update_category_status(
        category_id, data.is_active, updater_id=admin_user["id"]
    )
    status_text = "diaktifkan" if data.is_active else "dinonaktifkan"
    return success_response(data=category, message=f"Kategori sampah berhasil {status_text}.")


@router.delete("/admin/master/categories/{category_id}")
def delete_category(category_id: str, admin_user: dict = Depends(require_admin)):
    """Hapus kategori sampah secara permanen (Admin)."""
    category_service.delete_category(category_id)
    return success_response(message="Kategori sampah berhasil dihapus.")
