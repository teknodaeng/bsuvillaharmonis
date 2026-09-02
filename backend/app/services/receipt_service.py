import io
from datetime import datetime
from typing import Any, Dict
from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A5, letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings
from app.services.transaction_service import transaction_service
from app.utils.currency import format_rupiah
from app.utils.formatting import format_datetime, format_kg


class ReceiptService:
    @classmethod
    def get_receipt_data(cls, transaction_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch and format receipt data for viewing or printing."""
        tx = transaction_service.get_transaction_by_id(transaction_id)
        
        # Access control: If user is NASABAH, verify ownership
        if current_user.get("role") == "NASABAH":
            if current_user.get("nasabah_id") != tx["nasabah_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Anda tidak memiliki izin untuk melihat bukti transaksi nasabah lain.",
                )

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        detail_data = None
        if tx["type"] == "SETOR":
            detail_data = {
                "category_code": tx["category"].get("code") if tx.get("category") else None,
                "category_name": tx["category"]["name"] if tx.get("category") else None,
                "weight_kg": tx["weight_kg"],
                "weight_formatted": format_kg(tx["weight_gram"]),
                "price_per_kg": tx["price_per_kg"],
                "price_formatted": f"{format_rupiah(tx['price_per_kg'])}/kg",
                "amount": tx["amount"],
                "amount_formatted": format_rupiah(tx["amount"]),
            }
        else:
            detail_data = {
                "category_code": None,
                "category_name": None,
                "weight_kg": None,
                "weight_formatted": None,
                "price_per_kg": None,
                "price_formatted": None,
                "amount": tx["amount"],
                "amount_formatted": format_rupiah(tx["amount"]),
            }

        return {
            "app_name": settings.BANK_NAME,
            "title": "BUKTI TRANSAKSI TABUNGAN BANK SAMPAH",
            "transaction_no": tx["transaction_no"],
            "transaction_date": tx["transaction_date"],
            "transaction_date_formatted": format_datetime(tx["transaction_date"]),
            "type": tx["type"],
            "type_display": "SETOR SAMPAH" if tx["type"] == "SETOR" else "TARIK TUNAI",
            "nasabah": {
                "id": tx["nasabah_id"],
                "customer_id": tx["nasabah_customer_id"],
                "account_no": tx["nasabah_customer_id"],
                "name": tx["nasabah_name"],
                "nik": tx["nasabah_nik"],
                "phone": tx.get("nasabah_phone"),
                "address": tx.get("nasabah_address"),
            },
            "detail": detail_data,
            "mutation": {
                "debit": tx["debit"],
                "debit_formatted": format_rupiah(tx["debit"]),
                "credit": tx["credit"],
                "credit_formatted": format_rupiah(tx["credit"]),
                "balance_after": tx["balance_after"],
                "balance_after_formatted": format_rupiah(tx["balance_after"]),
            },
            "notes": tx.get("notes") or "-",
            "footer": settings.RECEIPT_FOOTER,
            "printed_at": now_str,
        }

    @classmethod
    def generate_receipt_pdf(cls, transaction_id: str, current_user: Dict[str, Any]) -> bytes:
        """Generate PDF binary stream for a transaction receipt using ReportLab."""
        receipt = cls.get_receipt_data(transaction_id, current_user)
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A5,
            rightMargin=24,
            leftMargin=24,
            topMargin=24,
            bottomMargin=24
        )
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#15803d"),
            alignment=1, # Center
            spaceAfter=2
        )
        subtitle_style = ParagraphStyle(
            "SubTitleStyle",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4b5563"),
            alignment=1,
            spaceAfter=10
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading4"],
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#1f2937"),
            spaceBefore=6,
            spaceAfter=4
        )
        normal_style = ParagraphStyle(
            "ReceiptNormal",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#111827")
        )
        normal_right = ParagraphStyle(
            "ReceiptNormalRight",
            parent=normal_style,
            alignment=2
        )
        bold_style = ParagraphStyle(
            "ReceiptBold",
            parent=normal_style,
            fontName="Helvetica-Bold"
        )
        bold_right = ParagraphStyle(
            "ReceiptBoldRight",
            parent=normal_right,
            fontName="Helvetica-Bold"
        )
        th_left = ParagraphStyle(
            "ReceiptTHL",
            parent=bold_style,
            textColor=colors.HexColor("#166534"),
            alignment=0
        )
        th_right = ParagraphStyle(
            "ReceiptTHR",
            parent=bold_right,
            textColor=colors.HexColor("#166534"),
            alignment=2
        )
        footer_style = ParagraphStyle(
            "ReceiptFooter",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#6b7280"),
            alignment=1
        )

        elements = []
        
        # Header
        elements.append(Paragraph(receipt["app_name"].upper(), title_style))
        elements.append(Paragraph(receipt["title"], subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#d1d5db"), spaceAfter=8))

        # Metadata Table
        meta_data = [
            [Paragraph("<b>No. Transaksi:</b>", normal_style), Paragraph(receipt["transaction_no"], bold_style),
             Paragraph("<b>Tanggal:</b>", normal_style), Paragraph(receipt["transaction_date_formatted"], normal_style)],
            [Paragraph("<b>ID Nasabah:</b>", normal_style), Paragraph(receipt["nasabah"]["customer_id"], bold_style),
             Paragraph("<b>NIK:</b>", normal_style), Paragraph(receipt["nasabah"]["nik"], normal_style)],
            [Paragraph("<b>Nama Nasabah:</b>", normal_style), Paragraph(receipt["nasabah"]["name"], normal_style),
             Paragraph("<b>Jenis:</b>", normal_style), Paragraph(receipt["type_display"], bold_style)],
        ]
        meta_table = Table(meta_data, colWidths=[80, 110, 55, 115])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 8))

        # Details Table
        if receipt["type"] == "SETOR" and receipt["detail"]:
            elements.append(Paragraph("Detail Setoran", section_heading))
            det = receipt["detail"]
            detail_data = [
                [
                    Paragraph("<b>Kelompok Sampah</b>", th_left),
                    Paragraph("<b>Berat</b>", th_right),
                    Paragraph("<b>Harga/kg</b>", th_right),
                    Paragraph("<b>Total Nilai</b>", th_right)
                ],
                [
                    Paragraph(det["category_name"] or "-", normal_style),
                    Paragraph(det["weight_formatted"] or "-", normal_right),
                    Paragraph(det["price_formatted"] or "-", normal_right),
                    Paragraph(det["amount_formatted"], normal_right)
                ]
            ]
            detail_table = Table(detail_data, colWidths=[140, 70, 75, 75])
            detail_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f0fdf4")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(detail_table)
            elements.append(Spacer(1, 8))

        # Mutation & Balance Table
        elements.append(Paragraph("Mutasi & Saldo Tabungan", section_heading))
        mut = receipt["mutation"]
        mutation_data = [
            [Paragraph("Debit (Penarikan)", normal_style), Paragraph(mut["debit_formatted"], normal_right)],
            [Paragraph("Kredit (Setoran)", normal_style), Paragraph(mut["credit_formatted"], normal_right)],
            [Paragraph("<b>Saldo Akhir Tabungan</b>", bold_style), Paragraph(f"<b>{mut['balance_after_formatted']}</b>", bold_right)],
        ]
        mutation_table = Table(mutation_data, colWidths=[230, 130])
        mutation_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#f9fafb")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(mutation_table)
        elements.append(Spacer(1, 8))

        if receipt.get("notes") and receipt["notes"] != "-":
            elements.append(Paragraph(f"<b>Catatan:</b> {receipt['notes']}", normal_style))
            elements.append(Spacer(1, 8))

        # Footer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
        elements.append(Paragraph(receipt["footer"], footer_style))
        elements.append(Paragraph(f"Dicetak pada: {receipt['printed_at']}", footer_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()


receipt_service = ReceiptService()
