import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Transactions & Balance Management', () => {
  let adminToken: string;
  let nasabahId: string;
  let priceId: string;
  let lastTxId: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login admin
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'AdminPassword123!' }),
    });
    const loginJson = await loginRes.json();
    adminToken = loginJson.data.access_token;

    // Create a nasabah
    const randomNik = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
    const nasabahRes = await app.request('/api/v1/admin/nasabah', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nik: randomNik,
        name: 'Nasabah Transaksi Test',
        phone: '081233445566',
        address: 'Villa Harmonis Blok B No. 12',
        password: 'Password123!',
      }),
    });
    const nasabahJson = await nasabahRes.json();
    nasabahId = nasabahJson.data.id;

    // Get an active price
    const pricesRes = await app.request('/api/v1/master/waste-prices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pricesJson = await pricesRes.json();
    priceId = pricesJson.data.items[0].id;
  });

  it('POST /api/v1/admin/transactions should record SETOR and increase balance', async () => {
    const res = await app.request('/api/v1/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nasabah_id: nasabahId,
        type: 'SETOR',
        price_id: priceId,
        weight_kg: 2.5,
        notes: 'Setor kardus 2.5 kg',
      }),
    });

    const json = await res.json();
    if (res.status !== 201) {
      console.log('SETOR ERROR JSON:', JSON.stringify(json));
    }
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe('SETOR');
    expect(json.data.weight_gram).toBe(2500);
    expect(json.data.amount).toBeGreaterThan(0);
    expect(json.data.balance_after).toBe(json.data.amount);
    lastTxId = json.data.id;
  });

  it('POST /api/v1/admin/transactions TARIK with excess amount should fail (Balance Guard)', async () => {
    const res = await app.request('/api/v1/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nasabah_id: nasabahId,
        type: 'TARIK',
        amount: 999999999, // Way more than balance
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Saldo tidak mencukupi');
  });

  it('GET /api/v1/admin/transactions/:id/receipt?format=pdf should return PDF binary stream', async () => {
    const res = await app.request(`/api/v1/admin/transactions/${lastTxId}/receipt?format=pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(500);
  });
});
