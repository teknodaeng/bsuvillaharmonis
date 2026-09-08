import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Master Waste Prices API & Service', () => {
  let adminToken: string;
  let categoryId: string;
  let createdPriceId: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login as admin
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'AdminPassword123!' }),
    });
    const loginJson = await loginRes.json();
    adminToken = loginJson.data.access_token;

    // Get an active category
    const catRes = await app.request('/api/v1/master/categories?is_active=true');
    const catJson = await catRes.json();
    categoryId = catJson.data.items[0].id;
  });

  it('GET /api/v1/master/waste-prices should return list of prices with pagination and unit', async () => {
    const res = await app.request('/api/v1/master/waste-prices');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toBeInstanceOf(Array);
    expect(json.data.items.length).toBeGreaterThan(0);
    expect(json.data.pagination).toBeDefined();

    const firstItem = json.data.items[0];
    expect(firstItem.price_per_kg).toBeGreaterThan(0);
    expect(firstItem.unit).toBeDefined();
    expect(firstItem.category_name).toBeDefined();
  });

  it('POST /api/v1/admin/master/waste-prices should create new price without deactivating existing items', async () => {
    // Count existing active prices before creation
    const beforeRes = await app.request(`/api/v1/master/waste-prices?category_id=${categoryId}&status=ACTIVE`);
    const beforeJson = await beforeRes.json();
    const countBefore = beforeJson.data.total_items || beforeJson.data.items.length;

    // Create a new price item
    const createRes = await app.request('/api/v1/admin/master/waste-prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category_id: categoryId,
        price_code: 'TEST-01',
        group_name: 'Test Item Plastik',
        example_items: 'Contoh botol plastik uji coba',
        price_per_kg: 4500,
        unit: 'kg',
        effective_date: '2026-09-01',
        status: 'ACTIVE',
        notes: 'Penetapan harga uji coba otomatis',
      }),
    });

    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    createdPriceId = createJson.data.id;
    expect(createJson.data.price_code).toBe('TEST-01');
    expect(createJson.data.price_per_kg).toBe(4500);
    expect(createJson.data.unit).toBe('kg');

    // Verify existing active prices in the same category were NOT deactivated
    const afterRes = await app.request(`/api/v1/master/waste-prices?category_id=${categoryId}&status=ACTIVE`);
    const afterJson = await afterRes.json();
    const countAfter = afterJson.data.total_items || afterJson.data.items.length;
    expect(countAfter).toBe(countBefore + 1);
  });

  it('PUT /api/v1/admin/master/waste-prices/:id should update price and log history', async () => {
    const updateRes = await app.request(`/api/v1/admin/master/waste-prices/${createdPriceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price_per_kg: 5000,
        unit: 'pcs',
        notes: 'Kenaikan harga uji coba',
      }),
    });

    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.data.price_per_kg).toBe(5000);
    expect(updateJson.data.unit).toBe('pcs');
  });

  it('GET /api/v1/master/waste-prices/:id/histories should return price history trail', async () => {
    const historyRes = await app.request(`/api/v1/master/waste-prices/${createdPriceId}/histories`);
    expect(historyRes.status).toBe(200);
    const historyJson = await historyRes.json();
    expect(historyJson.success).toBe(true);
    expect(historyJson.data).toBeInstanceOf(Array);
    expect(historyJson.data.length).toBeGreaterThanOrEqual(2); // CREATE + UPDATE
    expect(historyJson.data.some((h: any) => h.action === 'CREATE')).toBe(true);
    expect(historyJson.data.some((h: any) => h.action === 'UPDATE')).toBe(true);
  });

  it('DELETE /api/v1/admin/master/waste-prices/:id should remove test price item', async () => {
    const deleteRes = await app.request(`/api/v1/admin/master/waste-prices/${createdPriceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.status).toBe(200);

    const getRes = await app.request(`/api/v1/master/waste-prices/${createdPriceId}`);
    expect(getRes.status).toBe(404);
  });
});
