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

  it('POST /api/v1/admin/transactions should record multi-item SETOR and increase balance', async () => {
    // Get master prices
    const pricesRes = await app.request('/api/v1/master/waste-prices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pricesJson = await pricesRes.json();
    const price1 = pricesJson.data.items[0];
    const price2 = pricesJson.data.items[1] || pricesJson.data.items[0];

    const nasabahRes = await app.request(`/api/v1/admin/nasabah/${nasabahId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const nasabahJson = (await nasabahRes.json()) as any;
    const prevBalance = nasabahJson.data.balance;

    const res = await app.request('/api/v1/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nasabah_id: nasabahId,
        type: 'SETOR',
        items: [
          { price_id: price1.id, weight_kg: 2.0 },
          { price_id: price2.id, weight_kg: 3.5 },
        ],
        notes: 'Setor multi-item gabungan',
      }),
    });

    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe('SETOR');
    expect(json.data.items).toHaveLength(2);
    expect(json.data.weight_gram).toBe(5500); // 2.0 + 3.5 kg = 5500 g

    const expectedSubtotal1 = Math.round(2.0 * price1.price_per_kg);
    const expectedSubtotal2 = Math.round(3.5 * price2.price_per_kg);
    const expectedTotal = expectedSubtotal1 + expectedSubtotal2;

    expect(json.data.amount).toBe(expectedTotal);
    expect(json.data.balance_after).toBe(prevBalance + expectedTotal);

    // Test receipt PDF for multi-item
    const multiTxId = json.data.id;
    const receiptRes = await app.request(`/api/v1/admin/transactions/${multiTxId}/receipt?format=pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(receiptRes.status).toBe(200);
    const pdfBuf = await receiptRes.arrayBuffer();
    expect(pdfBuf.byteLength).toBeGreaterThan(500);
  }, 25000);

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
