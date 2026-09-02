import pytest


def test_reports_excel_and_pdf_generation(client, admin_auth_headers):
    """Test all 4 types of Excel and PDF report exports."""
    # 1. Transactions Report (.xlsx & .pdf)
    trx_xlsx = client.get("/api/v1/admin/reports/transactions.xlsx", headers=admin_auth_headers)
    assert trx_xlsx.status_code == 200
    assert "spreadsheetml" in trx_xlsx.headers["content-type"]
    assert len(trx_xlsx.content) > 100

    trx_pdf = client.get("/api/v1/admin/reports/transactions.pdf", headers=admin_auth_headers)
    assert trx_pdf.status_code == 200
    assert trx_pdf.headers["content-type"] == "application/pdf"
    assert len(trx_pdf.content) > 100

    # 2. Category Recap Report (.xlsx & .pdf)
    cat_xlsx = client.get("/api/v1/admin/reports/category-recap.xlsx", headers=admin_auth_headers)
    assert cat_xlsx.status_code == 200
    assert len(cat_xlsx.content) > 100

    cat_pdf = client.get("/api/v1/admin/reports/category-recap.pdf", headers=admin_auth_headers)
    assert cat_pdf.status_code == 200
    assert len(cat_pdf.content) > 100

    # 3. Nasabah Report (.xlsx & .pdf)
    nas_xlsx = client.get("/api/v1/admin/reports/nasabah.xlsx", headers=admin_auth_headers)
    assert nas_xlsx.status_code == 200
    assert len(nas_xlsx.content) > 100

    nas_pdf = client.get("/api/v1/admin/reports/nasabah.pdf", headers=admin_auth_headers)
    assert nas_pdf.status_code == 200
    assert len(nas_pdf.content) > 100

    # 4. Prices Report (.xlsx & .pdf)
    prc_xlsx = client.get("/api/v1/admin/reports/prices.xlsx", headers=admin_auth_headers)
    assert prc_xlsx.status_code == 200
    assert len(prc_xlsx.content) > 100

    prc_pdf = client.get("/api/v1/admin/reports/prices.pdf", headers=admin_auth_headers)
    assert prc_pdf.status_code == 200
    assert len(prc_pdf.content) > 100


def test_reports_require_admin(client):
    """Test that unauthorized requests to reports are rejected."""
    unauth = client.get("/api/v1/admin/reports/transactions.xlsx")
    assert unauth.status_code == 401
