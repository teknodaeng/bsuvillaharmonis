from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from app.core.deps import require_admin
from app.services.report_service import report_service

router = APIRouter(prefix="/admin/reports", tags=["Laporan PDF & Excel (Admin)"])


# 1. TRANSAKSI
@router.get("/transactions.xlsx")
def get_transactions_report_excel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    nasabah_id: Optional[str] = Query(None),
    admin_user: dict = Depends(require_admin)
):
    """Download laporan transaksi format Excel (.xlsx)."""
    excel_bytes = report_service.export_transactions_excel(
        start_date=start_date, end_date=end_date, type_filter=type,
        category_id=category_id, nasabah_id=nasabah_id
    )
    filename = f"laporan-transaksi-{start_date or 'all'}-{end_date or date.today().isoformat()}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/transactions.pdf")
def get_transactions_report_pdf(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    nasabah_id: Optional[str] = Query(None),
    admin_user: dict = Depends(require_admin)
):
    """Download laporan transaksi format PDF (.pdf)."""
    pdf_bytes = report_service.export_transactions_pdf(
        start_date=start_date, end_date=end_date, type_filter=type,
        category_id=category_id, nasabah_id=nasabah_id
    )
    filename = f"laporan-transaksi-{start_date or 'all'}-{end_date or date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# 2. REKAP KATEGORI
@router.get("/category-recap.xlsx")
def get_category_recap_excel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(require_admin)
):
    """Download laporan rekapitulasi setoran per kategori sampah (.xlsx)."""
    excel_bytes = report_service.export_category_recap_excel(start_date=start_date, end_date=end_date)
    filename = f"laporan-rekap-kategori-{start_date or 'all'}-{end_date or date.today().isoformat()}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/category-recap.pdf")
def get_category_recap_pdf(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(require_admin)
):
    """Download laporan rekapitulasi setoran per kategori sampah (.pdf)."""
    pdf_bytes = report_service.export_category_recap_pdf(start_date=start_date, end_date=end_date)
    filename = f"laporan-rekap-kategori-{start_date or 'all'}-{end_date or date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# 3. NASABAH & SALDO
@router.get("/nasabah.xlsx")
def get_nasabah_report_excel(admin_user: dict = Depends(require_admin)):
    """Download daftar seluruh nasabah dan saldo tabungan (.xlsx)."""
    excel_bytes = report_service.export_nasabah_excel()
    filename = f"laporan-nasabah-saldo-{date.today().isoformat()}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/nasabah.pdf")
def get_nasabah_report_pdf(admin_user: dict = Depends(require_admin)):
    """Download daftar seluruh nasabah dan saldo tabungan (.pdf)."""
    pdf_bytes = report_service.export_nasabah_pdf()
    filename = f"laporan-nasabah-saldo-{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# 4. DAFTAR HARGA
@router.get("/prices.xlsx")
def get_prices_report_excel(admin_user: dict = Depends(require_admin)):
    """Download daftar master harga sampah (.xlsx)."""
    excel_bytes = report_service.export_prices_excel()
    filename = f"laporan-master-harga-{date.today().isoformat()}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/prices.pdf")
def get_prices_report_pdf(admin_user: dict = Depends(require_admin)):
    """Download daftar master harga sampah (.pdf)."""
    pdf_bytes = report_service.export_prices_pdf()
    filename = f"laporan-master-harga-{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
