import httpx
import pytest

BASE_URL = "http://localhost:8001/api/v1"

def test_full_live_e2e_flow():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Login Admin
    login_res = client.post("/auth/login", json={
        "identifier": "admin",
        "password": "AdminPassword123!"
    })
    assert login_res.status_code == 200
    admin_data = login_res.json()["data"]
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Get Admin Dashboard
    dash_res = client.get("/admin/dashboard", headers=admin_headers)
    assert dash_res.status_code == 200
    assert "total_nasabah" in dash_res.json()["data"]

    import time
    unique_suffix = str(int(time.time()))[-10:]
    test_nik = f"320199{unique_suffix}"
    
    # 3. Register New Nasabah
    reg_res = client.post("/auth/register", json={
        "nik": test_nik,
        "name": f"Budi Santoso {unique_suffix}",
        "phone": f"0812{unique_suffix}",
        "address": "Jl. Melati Indah No. 10",
        "email": f"budi.{unique_suffix}@example.com",
        "password": "Password123!"
    })
    assert reg_res.status_code == 201
    nasabah_data = reg_res.json()["data"]["nasabah"]
    customer_id = nasabah_data["customer_id"]
    nasabah_id = nasabah_data["id"]
    assert customer_id.startswith("bsuvh")

    # 4. Login as Nasabah using NIK
    nasabah_login_res = client.post("/auth/login", json={
        "identifier": test_nik,
        "password": "Password123!"
    })
    assert nasabah_login_res.status_code == 200
    nasabah_token = nasabah_login_res.json()["data"]["access_token"]
    nasabah_headers = {"Authorization": f"Bearer {nasabah_token}"}

    # 5. Check Nasabah Profile & Initial Balance (Rp 0)
    profile_res = client.get("/me/nasabah", headers=nasabah_headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["data"]["balance"] == 0

    # 6. Admin records SETOR transaction for Budi
    categories_res = client.get("/master/categories", headers=admin_headers)
    assert categories_res.status_code == 200
    categories = categories_res.json()["data"]
    cat_pet = next(c for c in categories if c["code"] == "PLASTIK_PET")
    
    setor_res = client.post("/admin/transactions", headers=admin_headers, json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "category_id": cat_pet["id"],
        "weight_kg": 4.000,
        "notes": "Botol plastik bersih tanpa tutup"
    })
    assert setor_res.status_code == 201
    setor_data = setor_res.json()["data"]
    # 4.000 kg * Rp 3.500 = Rp 14.000
    assert setor_data["amount"] == 14000
    assert setor_data["balance_after"] == 14000
    tx_setor_id = setor_data["id"]

    # 7. Check Receipt Data & PDF Download
    receipt_res = client.get(f"/admin/transactions/{tx_setor_id}/receipt", headers=admin_headers)
    assert receipt_res.status_code == 200
    assert receipt_res.json()["data"]["nasabah"]["customer_id"] == customer_id

    receipt_pdf_res = client.get(f"/admin/transactions/{tx_setor_id}/receipt?format=pdf", headers=admin_headers)
    assert receipt_pdf_res.status_code == 200
    assert receipt_pdf_res.headers["content-type"] == "application/pdf"

    # 8. Admin records TARIK transaction for Budi
    tarik_res = client.post("/admin/transactions", headers=admin_headers, json={
        "nasabah_id": nasabah_id,
        "type": "TARIK",
        "amount": 4000,
        "notes": "Penarikan sebagian uang tabungan"
    })
    assert tarik_res.status_code == 201
    tarik_data = tarik_res.json()["data"]
    # 14.000 - 4.000 = 10.000
    assert tarik_data["amount"] == 4000
    assert tarik_data["balance_after"] == 10000

    # 9. Verify Nasabah Balance in Nasabah Portal
    nasabah_dash_res = client.get("/me/dashboard", headers=nasabah_headers)
    assert nasabah_dash_res.status_code == 200
    dash_data = nasabah_dash_res.json()["data"]
    assert dash_data["balance"] == 10000
    assert dash_data["total_setor"] == 14000
    assert dash_data["total_tarik"] == 4000
    assert len(dash_data["recent_transactions"]) == 2

    # 10. Admin Download Reports (Excel & PDF)
    tx_excel_res = client.get("/admin/reports/transactions.xlsx", headers=admin_headers)
    assert tx_excel_res.status_code == 200
    assert "spreadsheet" in tx_excel_res.headers["content-type"]

    tx_pdf_res = client.get("/admin/reports/transactions.pdf", headers=admin_headers)
    assert tx_pdf_res.status_code == 200
    assert tx_pdf_res.headers["content-type"] == "application/pdf"

    nasabah_excel_res = client.get("/admin/reports/nasabah.xlsx", headers=admin_headers)
    assert nasabah_excel_res.status_code == 200

    cat_recap_pdf_res = client.get("/admin/reports/category-recap.pdf", headers=admin_headers)
    assert cat_recap_pdf_res.status_code == 200

    print("\n[SUCCESS] Full Live E2E Integration Flow Verified 100%!")
