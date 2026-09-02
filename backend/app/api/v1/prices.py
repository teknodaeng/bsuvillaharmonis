from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.deps import require_admin
from app.schemas.price import (
    PriceCreateRequest,
    PriceStatusRequest,
    PriceUpdateRequest,
)
from app.services.price_service import price_service
from app.utils.responses import success_response

router = APIRouter(tags=["Master Harga Sampah"])


@router.get("/master/waste-prices")
def list_prices(
    category_id: Optional[str] = Query(None, description="Filter per kategori"),
    status: Optional[str] = Query(None, description="Filter status ACTIVE/INACTIVE"),
    search: Optional[str] = Query(None, description="Pencarian kategori atau catatan"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Daftar harga sampah dengan filter kategori, status, dan pagination."""
    items, total_items = price_service.list_prices(
        category_id=category_id,
        status_filter=status,
        search=search,
        page=page,
        page_size=page_size
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return success_response(
        data={
            "items": items,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
            }
        }
    )


@router.get("/master/categories/{category_id}/active-price")
def get_category_active_price(category_id: str):
    """Mendapatkan harga aktif terkini untuk kategori sampah tertentu."""
    price = price_service.get_active_price_by_category(category_id)
    return success_response(data=price)


@router.post("/admin/master/waste-prices", status_code=status.HTTP_201_CREATED)
def create_price(data: PriceCreateRequest, admin_user: dict = Depends(require_admin)):
    """Menetapkan harga sampah baru (Admin). Jika status ACTIVE, harga aktif lama otomatis nonaktif."""
    price = price_service.create_price(data, creator_id=admin_user["id"])
    return success_response(
        data=price,
        message="Master harga sampah berhasil disimpan.",
        status_code=status.HTTP_201_CREATED
    )


@router.put("/admin/master/waste-prices/{price_id}")
def update_price(
    price_id: str, data: PriceUpdateRequest, admin_user: dict = Depends(require_admin)
):
    """Ubah data harga sampah (Admin)."""
    price = price_service.update_price(price_id, data, updater_id=admin_user["id"])
    return success_response(data=price, message="Master harga sampah berhasil diperbarui.")


@router.patch("/admin/master/waste-prices/{price_id}/status")
def update_price_status(
    price_id: str, data: PriceStatusRequest, admin_user: dict = Depends(require_admin)
):
    """Ubah status ACTIVE/INACTIVE harga sampah (Admin)."""
    price = price_service.update_price_status(price_id, data.status, updater_id=admin_user["id"])
    return success_response(
        data=price,
        message=f"Status harga berhasil diubah menjadi {data.status}."
    )


@router.delete("/admin/master/waste-prices/{price_id}")
def delete_price(price_id: str, admin_user: dict = Depends(require_admin)):
    """Hapus master harga sampah secara permanen (Admin)."""
    price_service.delete_price(price_id)
    return success_response(message="Master harga sampah berhasil dihapus.")
