from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.deps import require_admin
from app.schemas.nasabah import (
    NasabahCreateRequest,
    NasabahStatusUpdateRequest,
    NasabahUpdateRequest,
)
from app.services.nasabah_service import nasabah_service
from app.services.transaction_service import transaction_service
from app.utils.responses import success_response

router = APIRouter(prefix="/admin/nasabah", tags=["Manajemen Nasabah (Admin)"])


@router.get("")
def list_nasabah(
    search: Optional[str] = Query(None, description="Pencarian nama, NIK, ID Nasabah, atau No. HP"),
    status: Optional[str] = Query(None, description="Filter status ACTIVE/INACTIVE"),
    page: int = Query(1, ge=1, description="Halaman"),
    page_size: int = Query(20, ge=1, le=1000, description="Jumlah item per halaman"),
    admin_user: dict = Depends(require_admin)
):
    """Daftar nasabah dengan pencarian, filter status, dan pagination."""
    items, total_items = nasabah_service.list_nasabah(
        search=search, status_filter=status, page=page, page_size=page_size
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


@router.post("", status_code=status.HTTP_201_CREATED)
def create_nasabah(data: NasabahCreateRequest, admin_user: dict = Depends(require_admin)):
    """Registrasi nasabah baru oleh Admin."""
    nasabah = nasabah_service.create_nasabah(
        data, registration_source="ADMIN", creator_id=admin_user["id"]
    )
    return success_response(
        data=nasabah,
        message="Nasabah berhasil didaftarkan.",
        status_code=status.HTTP_201_CREATED
    )


@router.get("/{nasabah_id}")
def get_nasabah_detail(nasabah_id: str, admin_user: dict = Depends(require_admin)):
    """Detail data nasabah beserta saldo."""
    nasabah = nasabah_service.get_nasabah_by_id(nasabah_id)
    return success_response(data=nasabah)


@router.put("/{nasabah_id}")
def update_nasabah(
    nasabah_id: str, data: NasabahUpdateRequest, admin_user: dict = Depends(require_admin)
):
    """Ubah data profil nasabah."""
    nasabah = nasabah_service.update_nasabah(nasabah_id, data, updater_id=admin_user["id"])
    return success_response(data=nasabah, message="Data nasabah berhasil diperbarui.")


@router.patch("/{nasabah_id}/status")
def update_nasabah_status(
    nasabah_id: str, data: NasabahStatusUpdateRequest, admin_user: dict = Depends(require_admin)
):
    """Aktifkan atau nonaktifkan status nasabah."""
    nasabah = nasabah_service.update_nasabah_status(nasabah_id, data.status, updater_id=admin_user["id"])
    return success_response(
        data=nasabah,
        message=f"Status nasabah berhasil diubah menjadi {data.status}."
    )


@router.get("/{nasabah_id}/balance")
def get_nasabah_balance(nasabah_id: str, admin_user: dict = Depends(require_admin)):
    """Mendapatkan saldo terakhir nasabah."""
    nasabah = nasabah_service.get_nasabah_by_id(nasabah_id)
    balance = nasabah_service.get_nasabah_balance(nasabah_id)
    return success_response(
        data={
            "nasabah_id": nasabah["id"],
            "customer_id": nasabah["customer_id"],
            "account_no": nasabah["account_no"],
            "name": nasabah["name"],
            "balance": balance,
        }
    )


@router.get("/{nasabah_id}/transactions")
def get_nasabah_transactions(
    nasabah_id: str,
    start_date: Optional[str] = Query(None, description="Tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    type: Optional[str] = Query(None, description="SETOR atau TARIK"),
    category_id: Optional[str] = Query(None, description="ID Kategori"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_user: dict = Depends(require_admin)
):
    """Riwayat transaksi nasabah tertentu."""
    # Validate nasabah exists
    nasabah_service.get_nasabah_by_id(nasabah_id)
    items, total_items = transaction_service.list_transactions(
        nasabah_id=nasabah_id,
        start_date=start_date,
        end_date=end_date,
        type_filter=type,
        category_id=category_id,
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
