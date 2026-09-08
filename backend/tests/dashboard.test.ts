import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Dashboard Waste Weight in Kg & Statistics', () => {
  let adminToken: string;
  let nasabahToken: string;
  let nasabahId: string;
  let priceId: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login Admin
    const adminLoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'AdminPassword123!' }),
    });
    const adminJson = await adminLoginRes.json();
    adminToken = adminJson.data.access_token;

    // Create a new nasabah
    const randomNik = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
    const nasabahRes = await app.request('/api/v1/admin/nasabah', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nik: randomNik,
        name: 'Nasabah Dashboard Test',
        phone: '081299887766',
        address: 'Villa Harmonis Blok C No. 5',
        password: 'Password123!',
      }),
    });
    const nasabahJson = await nasabahRes.json();
    nasabahId = nasabahJson.data.id;
    const customerId = nasabahJson.data.customer_id;

    // Login as the created nasabah
    const nasabahLoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: customerId, password: 'Password123!' }),
    });
    const nasabahLoginJson = await nasabahLoginRes.json();
    nasabahToken = nasabahLoginJson.data.access_token;

    // Fetch active price
    const pricesRes = await app.request('/api/v1/master/waste-prices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pricesJson = await pricesRes.json();
    priceId = pricesJson.data.items[0].id;

    // Record a SETOR transaction: 3.75 kg
    await app.request('/api/v1/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nasabah_id: nasabahId,
        type: 'SETOR',
        price_id: priceId,
        weight_kg: 3.75,
        notes: 'Setor uji coba dashboard 3.75 kg',
      }),
    });
  });

  it('GET /api/v1/admin/dashboard should return waste weight in kg and per category breakdown', async () => {
    const res = await app.request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('total_weight_kg');
    expect(json.data.total_weight_kg).toBeGreaterThanOrEqual(3.75);
    expect(json.data).toHaveProperty('total_weight_kg_formatted');
    expect(json.data).toHaveProperty('categories_weight');
    expect(Array.isArray(json.data.categories_weight)).toBe(true);

    const firstCatWithWeight = json.data.categories_weight.find((c: any) => c.total_weight_kg > 0);
    expect(firstCatWithWeight).toBeDefined();
    expect(firstCatWithWeight).toHaveProperty('category_name');
    expect(firstCatWithWeight).toHaveProperty('total_weight_kg');
    expect(firstCatWithWeight).toHaveProperty('total_weight_kg_formatted');
    expect(firstCatWithWeight).toHaveProperty('transaction_count');
    expect(firstCatWithWeight).toHaveProperty('total_amount');
    expect(firstCatWithWeight).toHaveProperty('percentage');
  });

  it('GET /api/v1/me/dashboard should return nasabah waste weight in kg and per category breakdown', async () => {
    const res = await app.request('/api/v1/me/dashboard', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('total_weight_kg');
    expect(json.data.total_weight_kg).toBe(3.75);
    expect(json.data).toHaveProperty('total_weight_kg_formatted');
    expect(json.data).toHaveProperty('categories_weight');
    expect(Array.isArray(json.data.categories_weight)).toBe(true);
    expect(json.data.categories_weight.length).toBeGreaterThan(0);
    expect(json.data.categories_weight[0].total_weight_kg).toBe(3.75);
    expect(json.data.categories_weight[0].percentage).toBe(100);
  });
});
