from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from app.core.deps import require_nasabah
from app.schemas.nasabah import NasabahUpdateRequest
from app.services.dashboard_service import dashboard_service
from app.services.nasabah_service import nasabah_service
from app.services.receipt_service import receipt_service
from app.services.transaction_service import transaction_service
from app.utils.responses import success_response

router = APIRouter(prefix="/me", tags=["Nasabah Login Portal"])


@router.get("/nasabah")
def get_my_profile(current_user: dict = Depends(require_nasabah)):
    """Profil nasabah yang sedang login."""
    nasabah = current_user["nasabah"]
    nasabah["balance"] = nasabah_service.get_nasabah_balance(nasabah["id"])
    return success_response(data=nasabah)


@router.put("/nasabah")
def update_my_profile(
    data: NasabahUpdateRequest,
    current_user: dict = Depends(require_nasabah)
):
    """Ubah data profil nasabah yang sedang login."""
    nasabah_id = current_user["nasabah_id"]
    nasabah = nasabah_service.update_nasabah(
        nasabah_id, data, updater_id=current_user["id"]
    )
    nasabah["balance"] = nasabah_service.get_nasabah_balance(nasabah_id)
    return success_response(
        data=nasabah,
        message="Profil data diri Anda berhasil diperbarui."
    )


@router.get("/balance")
def get_my_balance(current_user: dict = Depends(require_nasabah)):
    """Saldo tabungan nasabah yang sedang login."""
    nasabah_id = current_user["nasabah_id"]
    balance = nasabah_service.get_nasabah_balance(nasabah_id)
    return success_response(
        data={
            "nasabah_id": nasabah_id,
            "customer_id": current_user["nasabah"]["customer_id"],
            "account_no": current_user["nasabah"]["account_no"],
            "name": current_user["nasabah"]["name"],
            "balance": balance,
        }
    )


@router.get("/dashboard")
def get_my_dashboard(current_user: dict = Depends(require_nasabah)):
    """Ringkasan dashboard untuk nasabah yang sedang login."""
    data = dashboard_service.get_nasabah_dashboard(current_user["nasabah_id"])
    return success_response(data=data)


@router.get("/transactions")
def get_my_transactions(
    start_date: Optional[str] = Query(None, description="Tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    type: Optional[str] = Query(None, description="SETOR atau TARIK"),
    category_id: Optional[str] = Query(None, description="ID Kategori"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_nasabah)
):
    """Daftar riwayat transaksi milik nasabah yang sedang login."""
    items, total_items = transaction_service.list_transactions(
        nasabah_id=current_user["nasabah_id"],
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


@router.get("/transactions/{transaction_id}/receipt")
def get_my_receipt(
    transaction_id: str,
    format: Optional[str] = Query("json", description="json atau pdf"),
    current_user: dict = Depends(require_nasabah)
):
    """Bukti transaksi milik nasabah yang sedang login (JSON atau Download PDF)."""
    if format == "pdf":
        pdf_bytes = receipt_service.generate_receipt_pdf(transaction_id, current_user)
        filename = f"bukti-transaksi-{transaction_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    
    receipt_data = receipt_service.get_receipt_data(transaction_id, current_user)
    return success_response(data=receipt_data)
