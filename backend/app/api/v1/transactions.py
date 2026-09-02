from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from app.core.deps import require_admin
from app.schemas.transaction import TransactionCreateRequest
from app.services.receipt_service import receipt_service
from app.services.transaction_service import transaction_service
from app.utils.responses import success_response

router = APIRouter(prefix="/admin/transactions", tags=["Transaksi Bank Sampah (Admin)"])


@router.get("")
def list_transactions(
    start_date: Optional[str] = Query(None, description="Tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    type: Optional[str] = Query(None, description="SETOR atau TARIK"),
    category_id: Optional[str] = Query(None, description="ID Kategori sampah"),
    nasabah_id: Optional[str] = Query(None, description="ID Nasabah"),
    search: Optional[str] = Query(None, description="Pencarian nomor transaksi atau nama/NIK nasabah"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_user: dict = Depends(require_admin)
):
    """Daftar semua transaksi dengan filter dan pagination."""
    items, total_items = transaction_service.list_transactions(
        nasabah_id=nasabah_id,
        start_date=start_date,
        end_date=end_date,
        type_filter=type,
        category_id=category_id,
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


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreateRequest, admin_user: dict = Depends(require_admin)
):
    """Mencatat transaksi baru (SETOR sampah atau TARIK tunai)."""
    tx = transaction_service.create_transaction(data, creator_id=admin_user["id"])
    msg = "Transaksi setor berhasil disimpan." if data.type == "SETOR" else "Transaksi tarik tunai berhasil disimpan."
    return success_response(data=tx, message=msg, status_code=status.HTTP_201_CREATED)


@router.get("/{transaction_id}")
def get_transaction_detail(transaction_id: str, admin_user: dict = Depends(require_admin)):
    """Detail lengkap transaksi."""
    tx = transaction_service.get_transaction_by_id(transaction_id)
    return success_response(data=tx)


@router.get("/{transaction_id}/receipt")
def get_transaction_receipt(
    transaction_id: str,
    format: Optional[str] = Query("json", description="Format output: json atau pdf"),
    admin_user: dict = Depends(require_admin)
):
    """Mendapatkan bukti transaksi dalam format JSON atau file PDF (Admin)."""
    if format == "pdf":
        pdf_bytes = receipt_service.generate_receipt_pdf(transaction_id, admin_user)
        filename = f"bukti-transaksi-{transaction_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    
    receipt_data = receipt_service.get_receipt_data(transaction_id, admin_user)
    return success_response(data=receipt_data)
