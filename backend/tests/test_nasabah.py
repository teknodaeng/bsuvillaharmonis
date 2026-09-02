import pytest


def test_admin_create_and_list_nasabah(client, admin_auth_headers):
    """Test admin registering a new nasabah and listing."""
    payload = {
        "nik": "3201123456780010",
        "name": "Ahmad Dahlan",
        "phone": "081255566677",
        "address": "Jl. Sudirman No. 100",
        "email": "ahmad@example.com",
        "password": "Password123!"
    }
    create_res = client.post("/api/v1/admin/nasabah", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    nasabah = create_res.json()["data"]
    assert nasabah["registration_source"] == "ADMIN"
    assert nasabah["customer_id"].startswith("bsuvh")
    nasabah_id = nasabah["id"]

    # List nasabah
    list_res = client.get("/api/v1/admin/nasabah?search=Ahmad", headers=admin_auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()["data"]["items"]
    assert any(item["id"] == nasabah_id for item in items)

    # Get detail
    detail_res = client.get(f"/api/v1/admin/nasabah/{nasabah_id}", headers=admin_auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["name"] == "Ahmad Dahlan"


def test_admin_update_nasabah_and_status(client, admin_auth_headers):
    """Test admin updating profile details and status of a nasabah."""
    # Create nasabah
    create_res = client.post("/api/v1/admin/nasabah", json={
        "nik": "3201123456780011",
        "name": "Cut Nyak Dien",
        "phone": "081266677788",
        "address": "Jl. Teuku Umar No. 1",
        "password": "Password123!"
    }, headers=admin_auth_headers)
    nasabah_id = create_res.json()["data"]["id"]
    customer_id = create_res.json()["data"]["customer_id"]

    # Update profile
    upd_res = client.put(f"/api/v1/admin/nasabah/{nasabah_id}", json={
        "name": "Cut Nyak Meutia",
        "phone": "081299900011"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["name"] == "Cut Nyak Meutia"

    # Deactivate status
    status_res = client.patch(f"/api/v1/admin/nasabah/{nasabah_id}/status", json={
        "status": "INACTIVE"
    }, headers=admin_auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "INACTIVE"

    # Verify inactive user cannot login
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": customer_id,
        "password": "Password123!"
    })
    assert login_res.status_code == 403


def test_nasabah_rt_rw_kelurahan_kecamatan_kabupaten(client, admin_auth_headers):
    """Test creating and updating nasabah with RT, RW, Kelurahan, Kecamatan, and Kabupaten/Kota fields."""
    payload = {
        "nik": "3201123456780099",
        "name": "Budi Raharjo",
        "phone": "081233344455",
        "address": "Jl. Harmonis Blok A No. 1",
        "rt": "003",
        "rw": "007",
        "kelurahan": "Sukajaya",
        "kecamatan": "Tarogong",
        "kabupaten_kota": "Garut",
        "email": "budi.raharjo@example.com",
        "password": "Password123!"
    }
    create_res = client.post("/api/v1/admin/nasabah", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    nasabah = create_res.json()["data"]
    assert nasabah["rt"] == "003"
    assert nasabah["rw"] == "007"
    assert nasabah["kelurahan"] == "Sukajaya"
    assert nasabah["kecamatan"] == "Tarogong"
    assert nasabah["kabupaten_kota"] == "Garut"
    nasabah_id = nasabah["id"]

    # Update RT/RW and Kecamatan
    upd_res = client.put(f"/api/v1/admin/nasabah/{nasabah_id}", json={
        "rt": "004",
        "kecamatan": "Tarogong Kaler"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    updated = upd_res.json()["data"]
    assert updated["rt"] == "004"
    assert updated["rw"] == "007"
    assert updated["kecamatan"] == "Tarogong Kaler"
    assert updated["kabupaten_kota"] == "Garut"


def test_nasabah_category_selection(client, admin_auth_headers):
    """Test creating and updating nasabah with different categories (Sekolah, Instansi)."""
    # 1. Register with Sekolah category via self-registration
    reg_sekolah = client.post("/api/v1/auth/register", json={
        "nik": "3201123456780077",
        "name": "SMK Negeri 1 Harmonis",
        "nasabah_category": "Sekolah",
        "phone": "081277788899",
        "address": "Jl. Pendidikan No. 5",
        "password": "Password123!"
    })
    assert reg_sekolah.status_code == 201
    data_sekolah = reg_sekolah.json()["data"]["nasabah"]
    assert data_sekolah["nasabah_category"] == "Sekolah"
    sekolah_id = data_sekolah["id"]

    # 2. Register with Instansi category via admin
    reg_instansi = client.post("/api/v1/admin/nasabah", json={
        "nik": "3201123456780088",
        "name": "Kelurahan Harmonis",
        "nasabah_category": "Instansi",
        "phone": "081288899900",
        "address": "Jl. Pemuda No. 10",
        "password": "Password123!"
    }, headers=admin_auth_headers)
    assert reg_instansi.status_code == 201
    data_instansi = reg_instansi.json()["data"]
    assert data_instansi["nasabah_category"] == "Instansi"
    instansi_id = data_instansi["id"]

    # 3. Update category
    upd_res = client.put(f"/api/v1/admin/nasabah/{sekolah_id}", json={
        "nasabah_category": "Instansi"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["nasabah_category"] == "Instansi"


def test_nasabah_update_my_profile(client):
    """Test logged-in nasabah updating their own personal data via PUT /me/nasabah."""
    import time
    ts = int(time.time() * 1000)
    nik = f"3201{ts}"[:16]
    # 1. Register new Nasabah
    reg = client.post("/api/v1/auth/register", json={
        "nik": nik,
        "name": "Raden Ajeng Kartini",
        "phone": "081299998888",
        "address": "Jl. Jepara No. 21",
        "rt": "001",
        "rw": "002",
        "kelurahan": "Mayong",
        "kecamatan": "Jepara",
        "kabupaten_kota": "Jepara",
        "email": "kartini@example.com",
        "password": "Password123!"
    })
    assert reg.status_code == 201
    customer_id = reg.json()["data"]["nasabah"]["customer_id"]

    login_res = client.post("/api/v1/auth/login", json={
        "identifier": customer_id,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    nasabah_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get my profile
    get_res = client.get("/api/v1/me/nasabah", headers=nasabah_headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["name"] == "Raden Ajeng Kartini"

    # 3. Update my profile (including new NIK)
    new_nik = f"3202{ts}"[:16]
    upd_res = client.put("/api/v1/me/nasabah", json={
        "nik": new_nik,
        "name": "R.A. Kartini Sasroningrat",
        "phone": "081277776666",
        "address": "Jl. Pemuda No. 45",
        "rt": "005",
        "rw": "006",
        "kelurahan": "Bulu",
        "kecamatan": "Rembang",
        "kabupaten_kota": "Rembang",
        "nasabah_category": "Individu",
        "email": "ra.kartini@harmonis.id"
    }, headers=nasabah_headers)
    assert upd_res.status_code == 200
    updated = upd_res.json()["data"]
    assert updated["nik"] == new_nik
    assert updated["name"] == "R.A. Kartini Sasroningrat"
    assert updated["phone"] == "081277776666"
    assert updated["address"] == "Jl. Pemuda No. 45"
    assert updated["rt"] == "005"
    assert updated["rw"] == "006"
    assert updated["kelurahan"] == "Bulu"
    assert updated["kecamatan"] == "Rembang"
    assert updated["kabupaten_kota"] == "Rembang"
    assert updated["email"] == "ra.kartini@harmonis.id"

    # 4. Verify synchronized in users table and profile GET
    get_again = client.get("/api/v1/me/nasabah", headers=nasabah_headers)
    assert get_again.status_code == 200
    assert get_again.json()["data"]["nik"] == new_nik
    assert get_again.json()["data"]["name"] == "R.A. Kartini Sasroningrat"




