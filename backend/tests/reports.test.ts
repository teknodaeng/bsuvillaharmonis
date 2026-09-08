import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Reports & File Exports', () => {
  let adminToken: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'AdminPassword123!' }),
    });
    const loginJson = await loginRes.json();
    adminToken = loginJson.data.access_token;
  });

  it('GET /api/v1/admin/reports/transactions.xlsx should return valid Excel binary', async () => {
    const res = await app.request('/api/v1/admin/reports/transactions.xlsx', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml.sheet');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it('GET /api/v1/admin/reports/transactions.pdf should return valid PDF binary', async () => {
    const res = await app.request('/api/v1/admin/reports/transactions.pdf', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it('GET /api/v1/admin/reports/nasabah.xlsx and nasabah.pdf should succeed', async () => {
    const resXlsx = await app.request('/api/v1/admin/reports/nasabah.xlsx', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resXlsx.status).toBe(200);
    const bufXlsx = await resXlsx.arrayBuffer();
    expect(bufXlsx.byteLength).toBeGreaterThan(1000);

    const resPdf = await app.request('/api/v1/admin/reports/nasabah.pdf', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resPdf.status).toBe(200);
    const bufPdf = await resPdf.arrayBuffer();
    expect(bufPdf.byteLength).toBeGreaterThan(1000);
  });

  it('GET /api/v1/admin/reports/category-recap.xlsx and category-recap.pdf should succeed', async () => {
    const resXlsx = await app.request('/api/v1/admin/reports/category-recap.xlsx', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resXlsx.status).toBe(200);

    const resPdf = await app.request('/api/v1/admin/reports/category-recap.pdf', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resPdf.status).toBe(200);
  });

  it('GET /api/v1/admin/reports/prices.xlsx and prices.pdf should succeed', async () => {
    const resXlsx = await app.request('/api/v1/admin/reports/prices.xlsx', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resXlsx.status).toBe(200);

    const resPdf = await app.request('/api/v1/admin/reports/prices.pdf', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resPdf.status).toBe(200);
  });
});
