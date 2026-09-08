import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Auth & System Endpoints', () => {
  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();
  });

  it('GET /health should return healthy status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('healthy');
  });

  it('GET / should return online info with Hono framework', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.framework).toContain('Hono');
    expect(json.data.version).toBe('2.0.0');
  });

  it('POST /api/v1/auth/login should authenticate default admin', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'AdminPassword123!',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.access_token).toBeDefined();
    expect(json.data.refresh_token).toBeDefined();
    expect(json.data.user.role).toBe('ADMIN');
  });

  it('POST /api/v1/auth/login with wrong password should fail', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'wrongpassword',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('POST /api/v1/auth/register should register new nasabah and generate bsuvh account number', async () => {
    const randomNik = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
    const res = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nik: randomNik,
        name: 'Warga Mandiri Test',
        phone: '081299887766',
        address: 'Jl. Melati No. 45 RT 02 RW 05',
        password: 'Password123!',
        terms_accepted: true,
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.nasabah).toBeDefined();
    expect(json.data.nasabah.customer_id).toMatch(/^bsuvh\d{4}$/);
    expect(json.data.nasabah.nik).toBe(randomNik);
  });
});
