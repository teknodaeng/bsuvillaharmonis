import pytest


def test_category_crud_and_status(client, admin_auth_headers):
    """Test category creation, listing, updating, and deactivating."""
    # 1. Create Category
    payload = {
        "name": "Tembaga Super",
        "description": "Kabel tembaga kupas murni"
    }
    create_res = client.post("/api/v1/admin/master/categories", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    cat = create_res.json()["data"]
    assert cat["name"] == "Tembaga Super"
    cat_id = cat["id"]

    # 2. List categories
    list_res = client.get("/api/v1/master/categories?search=Tembaga")
    assert list_res.status_code == 200
    assert any(c["id"] == cat_id for c in list_res.json()["data"])

    # 3. Update category
    upd_res = client.put(f"/api/v1/admin/master/categories/{cat_id}", json={
        "name": "Tembaga Super Bersih",
        "description": "Kabel tembaga kilap bersih"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["name"] == "Tembaga Super Bersih"

    # 4. Deactivate category
    stat_res = client.patch(f"/api/v1/admin/master/categories/{cat_id}/status", json={
        "is_active": False
    }, headers=admin_auth_headers)
    assert stat_res.status_code == 200
    assert stat_res.json()["data"]["is_active"] is False


def test_price_independent_status_toggling(client, admin_auth_headers):
    """Test that active/inactive status of prices are independent and toggling one does not deactivate others."""
    # 1. Create Category
    cat_res = client.post("/api/v1/admin/master/categories", json={
        "name": "Aluminium Siku"
    }, headers=admin_auth_headers)
    cat_id = cat_res.json()["data"]["id"]

    # 2. Add first active price: Rp 12.000
    p1_res = client.post("/api/v1/admin/master/waste-prices", json={
        "category_id": cat_id,
        "price_per_kg": 12000,
        "status": "ACTIVE",
        "group_name": "Aluminium Tebal",
        "notes": "Harga awal tahun"
    }, headers=admin_auth_headers)
    assert p1_res.status_code == 201
    p1_id = p1_res.json()["data"]["id"]

    # 3. Add second active price: Rp 14.500
    p2_res = client.post("/api/v1/admin/master/waste-prices", json={
        "category_id": cat_id,
        "price_per_kg": 14500,
        "status": "ACTIVE",
        "group_name": "Aluminium Tipis",
        "notes": "Penyesuaian Bank Sampah Pusat"
    }, headers=admin_auth_headers)
    assert p2_res.status_code == 201
    p2_id = p2_res.json()["data"]["id"]

    # 4. Verify both p1 and p2 remain ACTIVE
    prices_res = client.get(f"/api/v1/master/waste-prices?category_id={cat_id}")
    items = prices_res.json()["data"]["items"]
    price1 = next(p for p in items if p["id"] == p1_id)
    price2 = next(p for p in items if p["id"] == p2_id)
    assert price1["status"] == "ACTIVE"
    assert price2["status"] == "ACTIVE"

    # 5. Deactivate p1 and verify p2 is still ACTIVE
    toggle_res = client.patch(f"/api/v1/admin/master/waste-prices/{p1_id}/status", json={
        "status": "INACTIVE"
    }, headers=admin_auth_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["data"]["status"] == "INACTIVE"

    prices_res2 = client.get(f"/api/v1/master/waste-prices?category_id={cat_id}")
    items2 = prices_res2.json()["data"]["items"]
    price1_after = next(p for p in items2 if p["id"] == p1_id)
    price2_after = next(p for p in items2 if p["id"] == p2_id)
    assert price1_after["status"] == "INACTIVE"
    assert price2_after["status"] == "ACTIVE"


def test_price_update_category(client, admin_auth_headers):
    """Test updating the category_id of an existing waste price."""
    # 1. Create two categories
    cat_a = client.post("/api/v1/admin/master/categories", json={"name": "Kategori Asal A"}, headers=admin_auth_headers).json()["data"]
    cat_b = client.post("/api/v1/admin/master/categories", json={"name": "Kategori Tujuan B"}, headers=admin_auth_headers).json()["data"]

    # 2. Create price under cat_a
    price_res = client.post("/api/v1/admin/master/waste-prices", json={
        "category_id": cat_a["id"],
        "price_per_kg": 7500,
        "group_name": "Kelompok Uji",
        "status": "ACTIVE"
    }, headers=admin_auth_headers)
    assert price_res.status_code == 201
    price_id = price_res.json()["data"]["id"]

    # 3. Update category to cat_b
    upd_res = client.put(f"/api/v1/admin/master/waste-prices/{price_id}", json={
        "category_id": cat_b["id"],
        "price_per_kg": 8000,
        "group_name": "Kelompok Uji Pindah"
    }, headers=admin_auth_headers)
    assert upd_res.status_code == 200
    updated_data = upd_res.json()["data"]
    assert updated_data["category_id"] == cat_b["id"]
    assert updated_data["category_name"] == "Kategori Tujuan B"
    assert updated_data["price_per_kg"] == 8000


def test_category_pagination(client, admin_auth_headers):
    """Test category pagination endpoint."""
    for i in range(5):
        client.post(
            "/api/v1/admin/master/categories",
            json={"name": f"Pagination Cat {i:02d}", "description": f"Desc {i}"},
            headers=admin_auth_headers
        )

    # Fetch page 1 with page_size=2
    res = client.get("/api/v1/master/categories?search=Pagination&page=1&page_size=2")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "items" in data
    assert "pagination" in data
    assert len(data["items"]) == 2
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 2
    assert data["pagination"]["total_items"] == 5
    assert data["pagination"]["total_pages"] == 3

    # Fetch page 3 with page_size=2 (should have 1 item)
    res_p3 = client.get("/api/v1/master/categories?search=Pagination&page=3&page_size=2")
    assert res_p3.status_code == 200
    data_p3 = res_p3.json()["data"]
    assert len(data_p3["items"]) == 1
    assert data_p3["pagination"]["page"] == 3

    # Deactivate the first item (Pagination Cat 00)
    cat_0 = data["items"][0]
    client.patch(f"/api/v1/admin/master/categories/{cat_0['id']}/status", json={"is_active": False}, headers=admin_auth_headers)

    # Now Pagination Cat 00 should move to the last position (page 3)
    res_sorted_p1 = client.get("/api/v1/master/categories?search=Pagination&page=1&page_size=2")
    assert all(c["is_active"] is True for c in res_sorted_p1.json()["data"]["items"])
    assert res_sorted_p1.json()["data"]["items"][0]["name"] == "Pagination Cat 01"

    res_sorted_p3 = client.get("/api/v1/master/categories?search=Pagination&page=3&page_size=2")
    assert res_sorted_p3.json()["data"]["items"][0]["id"] == cat_0["id"]
    assert res_sorted_p3.json()["data"]["items"][0]["is_active"] is False


def test_price_pagination_and_sorting(client, admin_auth_headers):
    """Test price pagination and sorting (ACTIVE first, INACTIVE last)."""
    # Create category
    cat_res = client.post(
        "/api/v1/admin/master/categories",
        json={"name": "Sort Price Cat"},
        headers=admin_auth_headers
    )
    cat_id = cat_res.json()["data"]["id"]

    # Create 4 prices: 2 INACTIVE, 2 ACTIVE
    for i, st in enumerate(["INACTIVE", "ACTIVE", "INACTIVE", "ACTIVE"]):
        client.post(
            "/api/v1/admin/master/waste-prices",
            json={
                "category_id": cat_id,
                "price_per_kg": 1000 * (i + 1),
                "group_name": f"Kelompok {i}",
                "status": st
            },
            headers=admin_auth_headers
        )

    # Fetch page 1 with page_size=2
    res = client.get(f"/api/v1/master/waste-prices?category_id={cat_id}&page=1&page_size=2")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["items"]) == 2
    assert data["pagination"]["total_items"] == 4
    assert data["pagination"]["total_pages"] == 2
    # Page 1 must have only ACTIVE status
    assert all(p["status"] == "ACTIVE" for p in data["items"])

    # Fetch page 2 with page_size=2
    res_p2 = client.get(f"/api/v1/master/waste-prices?category_id={cat_id}&page=2&page_size=2")
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()["data"]
    assert len(data_p2["items"]) == 2
    # Page 2 must have INACTIVE status
    assert all(p["status"] == "INACTIVE" for p in data_p2["items"])



