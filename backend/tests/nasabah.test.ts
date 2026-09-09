import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';
import { nasabahUpdateSchema, nasabahSelfUpdateSchema, nasabahCreateSchema } from '../src/schemas/nasabah.schema.js';

describe('Nasabah RT & RW 1-3 Digit Integer Validation & API', () => {
  let adminToken = '';
  let testNasabahId = '';

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Login as admin
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'AdminPassword123!',
      }),
    });
    const loginJson = await loginRes.json();
    adminToken = loginJson.data.access_token;

    // Fetch existing nasabah or create one for tests
    const listRes = await app.request('/api/v1/admin/nasabah?page_size=1', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listJson = await listRes.json();
    if (listJson.data?.items?.length > 0) {
      testNasabahId = listJson.data.items[0].id;
    }
  });

  describe('Zod Schema Unit Validations', () => {
    it('should accept 1 digit integer (1..9, 0)', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: 1, rw: 5 });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rt).toBe('1');
        expect(res.data.rw).toBe('5');
      }

      const resZero = nasabahUpdateSchema.safeParse({ rt: 0, rw: 0 });
      expect(resZero.success).toBe(true);
    });

    it('should accept 2 digits integer (10..99)', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: 12, rw: 34 });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rt).toBe('12');
        expect(res.data.rw).toBe('34');
      }
    });

    it('should accept 3 digits integer (100..999)', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: 123, rw: 999 });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rt).toBe('123');
        expect(res.data.rw).toBe('999');
      }
    });

    it('should accept string numbers from 1 to 3 digits (including leading zeros)', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: '001', rw: '05' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rt).toBe('001');
        expect(res.data.rw).toBe('05');
      }
    });

    it('should accept null, empty string, or undefined', () => {
      const resNull = nasabahUpdateSchema.safeParse({ rt: null, rw: null });
      expect(resNull.success).toBe(true);
      if (resNull.success) {
        expect(resNull.data.rt).toBeNull();
        expect(resNull.data.rw).toBeNull();
      }

      const resEmpty = nasabahUpdateSchema.safeParse({ rt: '', rw: '' });
      expect(resEmpty.success).toBe(true);
      if (resEmpty.success) {
        expect(resEmpty.data.rt).toBeNull();
        expect(resEmpty.data.rw).toBeNull();
      }

      const resUndef = nasabahUpdateSchema.safeParse({});
      expect(resUndef.success).toBe(true);
    });

    it('should reject integer with more than 3 digits (> 999)', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: 1000 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('RT harus berupa angka 1 sampai 3 digit');
      }
    });

    it('should reject negative integers', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: -1 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('RT harus berupa angka 1 sampai 3 digit');
      }
    });

    it('should reject float / decimal numbers', () => {
      const res = nasabahUpdateSchema.safeParse({ rt: 1.5 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('RT harus berupa angka 1 sampai 3 digit');
      }
    });

    it('should reject non-numeric string or string with > 3 digits', () => {
      const resLetters = nasabahUpdateSchema.safeParse({ rt: 'abc' });
      expect(resLetters.success).toBe(false);

      const res4Digits = nasabahUpdateSchema.safeParse({ rw: '1234' });
      expect(res4Digits.success).toBe(false);
    });

    it('should validate nasabahSelfUpdateSchema with same integer rules', () => {
      const resValid = nasabahSelfUpdateSchema.safeParse({ rt: 7, rw: 99 });
      expect(resValid.success).toBe(true);

      const resInvalid = nasabahSelfUpdateSchema.safeParse({ rt: 5000 });
      expect(resInvalid.success).toBe(false);
    });

    it('should accept NIK and phone as numbers without throwing Expected string error', () => {
      const res = nasabahUpdateSchema.safeParse({
        nik: 3201012345670001,
        phone: 81234567890,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.nik).toBe('3201012345670001');
        expect(res.data.phone).toBe('81234567890');
      }

      const resSelf = nasabahSelfUpdateSchema.safeParse({
        phone: 6281234567890,
      });
      expect(resSelf.success).toBe(true);
      if (resSelf.success) {
        expect(resSelf.data.phone).toBe('6281234567890');
      }
    });
  });

  describe('API Endpoint PUT /api/v1/admin/nasabah/:id', () => {
    it('should successfully update nasabah with 1 digit integer RT and RW', async () => {
      const res = await app.request(`/api/v1/admin/nasabah/${testNasabahId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rt: 1,
          rw: 5,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Number(json.data.rt)).toBe(1);
      expect(Number(json.data.rw)).toBe(5);
    });

    it('should successfully update nasabah with 2 and 3 digit integer RT and RW', async () => {
      const res = await app.request(`/api/v1/admin/nasabah/${testNasabahId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rt: 12,
          rw: 105,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Number(json.data.rt)).toBe(12);
      expect(Number(json.data.rw)).toBe(105);
    });

    it('should fail with 422 when RT exceeds 3 digits (e.g. 1000)', async () => {
      const res = await app.request(`/api/v1/admin/nasabah/${testNasabahId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rt: 1000,
        }),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('RT harus berupa angka 1 sampai 3 digit');
    });

    it('should fail with 422 when RW is negative integer', async () => {
      const res = await app.request(`/api/v1/admin/nasabah/${testNasabahId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rw: -5,
        }),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('RW harus berupa angka 1 sampai 3 digit');
    });
  });
});
