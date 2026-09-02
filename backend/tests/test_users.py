import pytest


def test_admin_list_users_with_role_filters(client, admin_auth_headers):
    """Test listing users with role filters (ALL, ADMIN, NASABAH)."""
    # 1. List ALL
    res = client.get("/api/v1/admin/users", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "items" in data
    assert "pagination" in data
    assert len(data["items"]) >= 1

    # Check default admin exists
    admin_item = next((u for u in data["items"] if u["username"] == "admin"), None)
    assert admin_item is not None
    assert admin_item["role"] == "ADMIN"
    assert admin_item["name"] == "Administrator Utama"

    # 2. Filter role=ADMIN
    res_admin = client.get("/api/v1/admin/users?role=ADMIN", headers=admin_auth_headers)
    assert res_admin.status_code == 200
    for u in res_admin.json()["data"]["items"]:
        assert u["role"] == "ADMIN"

    # 3. Filter role=NASABAH
    res_nasabah = client.get("/api/v1/admin/users?role=NASABAH", headers=admin_auth_headers)
    assert res_nasabah.status_code == 200
    for u in res_nasabah.json()["data"]["items"]:
        assert u["role"] == "NASABAH"


def test_admin_create_and_update_petugas_user(client, admin_auth_headers):
    """Test creating a new Admin/Petugas user, updating their profile, toggling status, and resetting password."""
    # 1. Create new Admin / Petugas
    payload = {
        "username": "petugas_loket1",
        "name": "Siti Petugas 1",
        "email": "petugas1@bsuvillaharmonis.id",
        "phone": "081234567899",
        "password": "PetugasPassword123!",
        "role": "ADMIN",
        "status": "ACTIVE"
    }
    create_res = client.post("/api/v1/admin/users", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    user_data = create_res.json()["data"]
    assert user_data["username"] == "petugas_loket1"
    assert user_data["name"] == "Siti Petugas 1"
    assert user_data["role"] == "ADMIN"
    user_id = user_data["id"]

    # 2. Login with newly created petugas
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "petugas_loket1",
        "password": "PetugasPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["data"]["user"]["role"] == "ADMIN"

    # 3. Update user
    upd_res = client.put(f"/api/v1/admin/users/{user_id}", json={
        "name": "Siti Rahmawati (Petugas)",
        "phone": "081234567888"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["name"] == "Siti Rahmawati (Petugas)"
    assert upd_res.json()["data"]["phone"] == "081234567888"

    # 4. Toggle status to INACTIVE
    status_res = client.patch(f"/api/v1/admin/users/{user_id}/status", json={
        "status": "INACTIVE"
    }, headers=admin_auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "INACTIVE"
    assert status_res.json()["data"]["is_active"] is False

    # 5. Login should now fail with 403 because account is INACTIVE
    login_inactive_res = client.post("/api/v1/auth/login", json={
        "identifier": "petugas_loket1",
        "password": "PetugasPassword123!"
    })
    assert login_inactive_res.status_code == 403

    # 6. Re-activate and reset password
    client.patch(f"/api/v1/admin/users/{user_id}/status", json={"status": "ACTIVE"}, headers=admin_auth_headers)
    reset_res = client.post(f"/api/v1/admin/users/{user_id}/reset-password", json={
        "new_password": "NewSecretPassword123!"
    }, headers=admin_auth_headers)
    assert reset_res.status_code == 200

    # 7. Login with new password succeeds
    login_new_res = client.post("/api/v1/auth/login", json={
        "identifier": "petugas_loket1",
        "password": "NewSecretPassword123!"
    })
    assert login_new_res.status_code == 200
