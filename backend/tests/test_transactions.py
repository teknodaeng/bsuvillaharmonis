import pytest


def test_transaction_setor_and_tarik_flow(client, admin_auth_headers):
    """Test full cycle of SETOR and TARIK transactions with balance verification."""
    # 1. Create a Nasabah
    reg = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780020",
        "name": "Hasanuddin",
        "phone": "081244455566",
        "address": "Jl. Somba Opu No. 20",
        "password": "Password123!"
    })
    nasabah_id = reg.json()["data"]["nasabah"]["id"]

    # 2. Get category Plastik PET (seeded with Rp 3.500)
    cats = client.get("/api/v1/master/categories?search=Plastik").json()["data"]
    plastik_id = cats[0]["id"]

    # 3. SETOR 2.5 kg of PLASTIK_PET -> 2.5 * 3500 = Rp 8.750
    setor_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "category_id": plastik_id,
        "weight_kg": 2.5,
        "notes": "Setoran botol plastik bersih",
        "idempotency_key": "idemp-setor-001"
    }, headers=admin_auth_headers)
    assert setor_res.status_code == 201
    tx_setor = setor_res.json()["data"]
    assert tx_setor["amount"] == 8750
    assert tx_setor["credit"] == 8750
    assert tx_setor["debit"] == 0
    assert tx_setor["balance_after"] == 8750
    assert tx_setor["transaction_no"].startswith("TRX-")

    # Verify nasabah balance is now 8750
    bal1 = client.get(f"/api/v1/admin/nasabah/{nasabah_id}/balance", headers=admin_auth_headers)
    assert bal1.json()["data"]["balance"] == 8750

    # 4. TARIK Rp 5.000 -> balance becomes 3.750
    tarik_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "TARIK",
        "amount": 5000,
        "notes": "Tarik tunai tabungan"
    }, headers=admin_auth_headers)
    assert tarik_res.status_code == 201
    tx_tarik = tarik_res.json()["data"]
    assert tx_tarik["amount"] == 5000
    assert tx_tarik["debit"] == 5000
    assert tx_tarik["credit"] == 0
    assert tx_tarik["balance_after"] == 3750

    # 5. TARIK Rp 10.000 (exceeds balance Rp 3.750) -> should fail 400
    over_tarik_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "TARIK",
        "amount": 10000,
    }, headers=admin_auth_headers)
    assert over_tarik_res.status_code == 400
    assert "Saldo tidak mencukupi" in over_tarik_res.json()["message"]


def test_transaction_idempotency(client, admin_auth_headers):
    """Test that submitting duplicate idempotency_key does not duplicate transaction or credit twice."""
    # Create Nasabah
    reg = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780021",
        "name": "Ki Hajar Dewantara",
        "phone": "081288899900",
        "address": "Jl. Tamansiswa No. 1",
        "password": "Password123!"
    })
    nasabah_id = reg.json()["data"]["nasabah"]["id"]

    cats = client.get("/api/v1/master/categories?search=Kardus").json()["data"]
    kardus_id = cats[0]["id"]

    idemp_key = "idemp-kardus-test-unique"

    # First request
    res1 = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "category_id": kardus_id,
        "weight_kg": 10.0,
        "idempotency_key": idemp_key
    }, headers=admin_auth_headers)
    assert res1.status_code == 201
    tx1 = res1.json()["data"]

    # Second request with same idempotency key
    res2 = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "category_id": kardus_id,
        "weight_kg": 10.0,
        "idempotency_key": idemp_key
    }, headers=admin_auth_headers)
    assert res2.status_code == 200 or res2.status_code == 201
    tx2 = res2.json()["data"]
    assert tx1["id"] == tx2["id"]
    assert tx1["balance_after"] == tx2["balance_after"]


def test_transaction_setor_with_exact_price_id(client, admin_auth_headers):
    """Test SETOR transaction accurately saves the chosen price_id and price_per_kg."""
    import time
    ts = int(time.time() * 1000)
    # 1. Create Nasabah
    reg = client.post("/api/v1/auth/register", json={
        "nik": f"3201{ts}"[:16],
        "name": f"I Gusti Ngurah Rai {ts}",
        "phone": f"0812{ts}"[:12],
        "address": "Jl. Denpasar No. 5",
        "password": "Password123!"
    })
    assert reg.status_code == 200 or reg.status_code == 201
    nasabah_id = reg.json()["data"]["nasabah"]["id"]

    # 2. Create custom category & price master
    cat_res = client.post("/api/v1/admin/master/categories", json={
        "name": f"Tembaga Murni {ts}",
        "description": "Kabel tembagan kupas bersih"
    }, headers=admin_auth_headers)
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["data"]["id"]

    price_res = client.post("/api/v1/admin/master/waste-prices", json={
        "category_id": cat_id,
        "price_per_kg": 75000,
        "group_name": "Logam Mulia / Tembaga Super",
        "example_items": "Kabel tembaga tebal kupas",
        "status": "ACTIVE"
    }, headers=admin_auth_headers)
    assert price_res.status_code == 201
    price_id = price_res.json()["data"]["id"]

    # 3. SETOR 3.250 kg of Tembaga Super (75000/kg) -> amount = 3.250 * 75000 = Rp 243.750
    setor_res = client.post("/api/v1/admin/transactions", json={
        "nasabah_id": nasabah_id,
        "type": "SETOR",
        "price_id": price_id,
        "category_id": cat_id,
        "weight_kg": 3.25,
        "notes": "Tembaga sangat bersih"
    }, headers=admin_auth_headers)
    assert setor_res.status_code == 201
    tx = setor_res.json()["data"]

    assert tx["price_per_kg"] == 75000
    assert tx["amount"] == 243750
    assert tx["credit"] == 243750
    assert tx["balance_after"] == 243750
    assert tx["category"]["group_name"] == "Logam Mulia / Tembaga Super"
    assert "Logam Mulia / Tembaga Super" in tx["category"]["name"]

    # 4. Fetch detail by ID
    get_res = client.get(f"/api/v1/admin/transactions/{tx['id']}", headers=admin_auth_headers)
    assert get_res.status_code == 200
    detail = get_res.json()["data"]
    assert detail["price_per_kg"] == 75000
    assert detail["amount"] == 243750
    assert detail["category"]["group_name"] == "Logam Mulia / Tembaga Super"
