import pytest


def test_receipt_data_and_pdf_generation(client, admin_auth_headers):
    """Test receipt JSON payload and PDF binary generation."""
    # 1. Create Nasabah
    reg = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780030",
        "name": "I Gusti Ngurah Rai",
        "phone": "081277788899",
        "address": "Jl. Denpasar No. 5",
        "password": "Password123!"
    })
    nasabah_id = reg.json()["data"]["nasabah"]["id"]
    customer_id = reg.json()["data"]["nasabah"]["customer_id"]

    # Login as nasabah
    login = client.post("/api/v1/auth/login", json={
        "identifier": customer_id,
        "password": "Password123!"
    })
    nasabah_token = login.json()["data"]["access_token"]
    nasabah_headers = {"Authorization": f"Bearer {nasabah_token}"}

    # 2. Admin creates SETOR transaction
    cats = client.get("/api/v1/master/categories?search=Minyak").json()["data"]
    minyak_id = cats[0]["id"]

    tx_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "category_id": minyak_id,
        "weight_kg": 3.0,
        "notes": "Minyak dalam 3 botol"
    }, headers=admin_auth_headers)
    tx_id = tx_res.json()["data"]["id"]

    # 3. Admin gets receipt JSON
    admin_rcp = client.get(f"/api/v1/admin/transactions/{tx_id}/receipt", headers=admin_auth_headers)
    assert admin_rcp.status_code == 200
    rcp_data = admin_rcp.json()["data"]
    assert rcp_data["title"] == "BUKTI TRANSAKSI TABUNGAN BANK SAMPAH"
    assert rcp_data["nasabah"]["customer_id"] == customer_id
    assert "detail" in rcp_data
    assert "mutation" in rcp_data

    # 4. Admin gets receipt PDF
    admin_pdf = client.get(f"/api/v1/admin/transactions/{tx_id}/receipt?format=pdf", headers=admin_auth_headers)
    assert admin_pdf.status_code == 200
    assert admin_pdf.headers["content-type"] == "application/pdf"
    assert len(admin_pdf.content) > 100

    # 5. Nasabah gets own receipt via /me/transactions/{id}/receipt
    me_rcp = client.get(f"/api/v1/me/transactions/{tx_id}/receipt", headers=nasabah_headers)
    assert me_rcp.status_code == 200

    me_pdf = client.get(f"/api/v1/me/transactions/{tx_id}/receipt?format=pdf", headers=nasabah_headers)
    assert me_pdf.status_code == 200
    assert me_pdf.headers["content-type"] == "application/pdf"


def test_nasabah_cannot_access_other_receipt(client, admin_auth_headers):
    """Test that a nasabah is forbidden from accessing another nasabah's receipt."""
    # Create Nasabah A
    reg_a = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780031",
        "name": "Nasabah A",
        "phone": "081211112222",
        "address": "Jl. A No. 1",
        "password": "Password123!"
    })
    nasabah_a_id = reg_a.json()["data"]["nasabah"]["id"]

    # Create Nasabah B
    reg_b = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780032",
        "name": "Nasabah B",
        "phone": "081233334444",
        "address": "Jl. B No. 2",
        "password": "Password123!"
    })
    cust_b_id = reg_b.json()["data"]["nasabah"]["customer_id"]

    # Login as Nasabah B
    login_b = client.post("/api/v1/auth/login", json={
        "identifier": cust_b_id,
        "password": "Password123!"
    })
    token_b = login_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Admin creates transaction for Nasabah A
    cats = client.get("/api/v1/master/categories?search=Kaca").json()["data"]
    kaca_id = cats[0]["id"]

    tx_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_a_id,
        "type": "SETOR",
        "category_id": kaca_id,
        "weight_kg": 5.0
    }, headers=admin_auth_headers)
    tx_a_id = tx_res.json()["data"]["id"]

    # Nasabah B attempts to view receipt of Nasabah A
    hacked = client.get(f"/api/v1/me/transactions/{tx_a_id}/receipt", headers=headers_b)
    assert hacked.status_code == 403
