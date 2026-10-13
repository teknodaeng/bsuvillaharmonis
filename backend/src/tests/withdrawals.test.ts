import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../app.js';
import { runMigrations } from '../db/migrations.js';
import { seedDatabase } from '../db/seed.js';

describe('Withdrawal Requests (Permohonan Penarikan Saldo)', () => {
  let adminToken: string;
  let nasabahToken: string;
  let nasabahId: string;
  let wastePriceId: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // 1. Login as Admin
    const adminLoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'AdminPassword123!',
      }),
    });
    const adminBody = await adminLoginRes.json();
    adminToken = adminBody.data.access_token;

    // 2. Create Nasabah
    const randomNik = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
    const nasabahRes = await app.request('/api/v1/admin/nasabah', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Nasabah Tarik Uji',
        nik: randomNik,
        phone: '081299998888',
        address: 'Jl. Melati No. 12',
        rt: '02',
        rw: '05',
        nasabah_category: 'Rumah Tangga/Individu',
        password: 'Password123!',
      }),
    });
    const nasabahJson = await nasabahRes.json();
    nasabahId = nasabahJson.data.id;

    // 3. Login as the newly created Nasabah
    const nasabahLoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: nasabahJson.data.account_no,
        password: 'Password123!',
      }),
    });
    const nasabahLoginJson = await nasabahLoginRes.json();
    nasabahToken = nasabahLoginJson.data.access_token;

    // 4. Fetch waste price
    const priceRes = await app.request('/api/v1/master/waste-prices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const priceJson = await priceRes.json();
    wastePriceId = priceJson.data.items[0].id;

    // 5. Admin records a SETOR transaction for this nasabah (50 kg)
    const setorRes = await app.request('/api/v1/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nasabah_id: nasabahId,
        type: 'SETOR',
        price_id: wastePriceId,
        weight_kg: 50,
      }),
    });
    expect(setorRes.status).toBe(201);
  });

  it('Nasabah cannot submit withdrawal if amount exceeds balance', async () => {
    const res = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 50000000, // 50 juta (exceeds balance)
        method: 'TUNAI',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error_code).toBe('INSUFFICIENT_BALANCE');
  });

  it('Nasabah cannot submit TRANSFER without bank details', async () => {
    const res = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 10000,
        method: 'TRANSFER',
      }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('Nasabah can submit a valid withdrawal request (TUNAI)', async () => {
    const res = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 5000,
        method: 'TUNAI',
        notes: 'Ambil di kantor bank sampah',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.amount).toBe(5000);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.request_no).toMatch(/^WD-\d{8}-\d{4}$/);
  });

  it('Nasabah can cancel their own pending withdrawal request', async () => {
    // 1. Create a request to cancel
    const createRes = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 5000,
        method: 'TUNAI',
        notes: 'Mau dibatalkan',
      }),
    });
    const created = await createRes.json();
    const requestId = created.data.id;

    // 2. Cancel request
    const cancelRes = await app.request(`/api/v1/me/withdrawal-requests/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nasabahToken}`,
      },
    });

    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.success).toBe(true);
    expect(cancelBody.data.status).toBe('CANCELLED');

    // 3. Trying to cancel again should fail
    const cancelAgainRes = await app.request(`/api/v1/me/withdrawal-requests/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nasabahToken}`,
      },
    });
    expect(cancelAgainRes.status).toBe(400);
  });

  it('Admin can approve pending withdrawal request and it deducts balance', async () => {
    // 1. Get initial balance
    const balRes1 = await app.request('/api/v1/me/balance', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    const initialBalance = (await balRes1.json()).data.balance;

    // 2. Nasabah requests withdrawal (TRANSFER)
    const createRes = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 10000,
        method: 'TRANSFER',
        bank_name: 'BCA',
        account_number: '1234567890',
        account_holder: 'Nasabah Tarik Uji',
        notes: 'Mohon ditransfer ke rekening BCA saya',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const requestId = created.data.id;

    // 3. Admin approves request
    const approveRes = await app.request(`/api/v1/admin/withdrawal-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        notes: 'Transfer berhasil diproses via BCA KlikBisnis',
      }),
    });

    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.success).toBe(true);
    expect(approveBody.data.status).toBe('APPROVED');
    expect(approveBody.data.transaction_no).toBeDefined();

    // 4. Verify balance is deducted
    const balRes2 = await app.request('/api/v1/me/balance', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    const finalBalance = (await balRes2.json()).data.balance;
    expect(finalBalance).toBe(initialBalance - 10000);

    // 5. Approving again fails
    const reApprove = await app.request(`/api/v1/admin/withdrawal-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });
    expect(reApprove.status).toBe(400);
  });

  it('Admin can reject pending withdrawal request with reason without deducting balance', async () => {
    // 1. Get current balance
    const balRes1 = await app.request('/api/v1/me/balance', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    const initialBalance = (await balRes1.json()).data.balance;

    // 2. Nasabah requests withdrawal
    const createRes = await app.request('/api/v1/me/withdrawal-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        amount: 8000,
        method: 'TUNAI',
        notes: 'Tarik tunai hari Jumat',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const requestId = created.data.id;

    // 3. Admin rejects request
    const rejectRes = await app.request(`/api/v1/admin/withdrawal-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rejection_reason: 'Mohon maaf, kas tunai sedang tutup. Silakan pilih transfer atau ajukan minggu depan.',
      }),
    });

    expect(rejectRes.status).toBe(200);
    const rejectBody = await rejectRes.json();
    expect(rejectBody.success).toBe(true);
    expect(rejectBody.data.status).toBe('REJECTED');
    expect(rejectBody.data.rejection_reason).toContain('kas tunai sedang tutup');

    // 4. Balance remains unchanged
    const balRes2 = await app.request('/api/v1/me/balance', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    const finalBalance = (await balRes2.json()).data.balance;
    expect(finalBalance).toBe(initialBalance);
  });

  it('Role Guard: Nasabah cannot access admin withdrawal endpoints', async () => {
    const res = await app.request('/api/v1/admin/withdrawal-requests', {
      headers: { Authorization: `Bearer ${nasabahToken}` },
    });
    expect(res.status).toBe(403);
  });
});
