import pytest


def test_self_registration_success(client):
    """Test successful self-registration and bsuvh0000 ID generation."""
    payload = {
        "nik": "3201123456780001",
        "name": "Budi Santoso",
        "phone": "081234567890",
        "address": "Jl. Melati No. 12, RT 01 RW 02",
        "email": "budi.santoso@example.com",
        "password": "Password123!"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    nasabah = body["data"]["nasabah"]
    assert nasabah["customer_id"].startswith("bsuvh")
    assert nasabah["nik"] == payload["nik"]
    assert nasabah["name"] == payload["name"]
    assert nasabah["status"] == "ACTIVE"


def test_self_registration_duplicate_nik(client):
    """Test that registering duplicate NIK returns 400 error."""
    payload = {
        "nik": "3201123456780001", # Same NIK
        "name": "Budi Santoso Clone",
        "phone": "081234567891",
        "address": "Jl. Melati No. 12",
        "password": "Password123!"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400
    assert "NIK sudah terdaftar" in res.json()["message"]


def test_login_with_different_identifiers(client):
    """Test login using customer_id (bsuvhXXXX), NIK, and admin username."""
    # 1. Register a user
    reg_payload = {
        "nik": "3201123456780002",
        "name": "Siti Aminah",
        "phone": "081298765432",
        "address": "Jl. Mawar No. 45",
        "password": "Password123!"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    customer_id = reg_res.json()["data"]["nasabah"]["customer_id"]

    # 2. Login with customer_id
    login_id_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": customer_id, "password": "Password123!"}
    )
    assert login_id_res.status_code == 200
    assert login_id_res.json()["data"]["user"]["role"] == "NASABAH"

    # 3. Login with NIK
    login_nik_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "3201123456780002", "password": "Password123!"}
    )
    assert login_nik_res.status_code == 200
    assert login_nik_res.json()["data"]["user"]["role"] == "NASABAH"

    # 4. Login with admin username
    login_admin_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin", "password": "AdminPassword123!"}
    )
    assert login_admin_res.status_code == 200
    assert login_admin_res.json()["data"]["user"]["role"] == "ADMIN"


def test_login_invalid_credentials(client):
    """Test invalid password or unknown identifier."""
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "unknown_user", "password": "wrongpassword"}
    )
    assert res.status_code == 400


def test_refresh_token(client):
    """Test token refresh mechanism."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin", "password": "AdminPassword123!"}
    )
    refresh_token = login_res.json()["data"]["refresh_token"]

    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()["data"]


def test_change_password(client):
    """Test user changing their password."""
    # Register user
    reg = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780003",
        "name": "Dewi Sartika",
        "phone": "081233344455",
        "address": "Jl. Kartini No. 8",
        "password": "OldPassword123!"
    })
    customer_id = reg.json()["data"]["nasabah"]["customer_id"]

    # Login
    login = client.post("/api/v1/auth/login", json={
        "identifier": customer_id,
        "password": "OldPassword123!"
    })
    token = login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Change password
    chg = client.post(
        "/api/v1/auth/change-password",
        json={
            "old_password": "OldPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        },
        headers=headers
    )
    assert chg.status_code == 200

    # Login with new password
    new_login = client.post("/api/v1/auth/login", json={
        "identifier": customer_id,
        "password": "NewPassword456!"
    })
    assert new_login.status_code == 200
