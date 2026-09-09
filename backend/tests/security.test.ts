import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { seedDatabase } from '../src/db/seed.js';
import { sanitizeExcelCell, sanitizeExcelRow } from '../src/utils/sanitizeExcel.js';
import { userCreateSchema } from '../src/schemas/user.schema.js';
import { nasabahSelfUpdateSchema } from '../src/schemas/nasabah.schema.js';
import { resetRateLimitStore } from '../src/middleware/rateLimiter.js';

describe('Security Controls & Hardening Verification', () => {
  let adminToken: string;
  let nasabahToken: string;
  let nasabahNik: string;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();
    resetRateLimitStore();

    // Login as default admin
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

    // Register a test nasabah
    nasabahNik = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));
    const regRes = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nik: nasabahNik,
        name: 'Nasabah Security Audit',
        phone: '081211223344',
        address: 'Kompleks Villa Harmonis No 99',
        password: 'Password123!',
        terms_accepted: true,
      }),
    });
    expect(regRes.status).toBe(201);

    // Login as nasabah
    const nLoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: nasabahNik,
        password: 'Password123!',
      }),
    });
    const nLoginJson = await nLoginRes.json();
    nasabahToken = nLoginJson.data.access_token;
  });

  it('SEC-11: Should include standard Security Headers in HTTP responses', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toContain('strict-origin');
  });

  it('SEC-06: Excel Formula Injection sanitizer should escape dangerous formula characters', () => {
    expect(sanitizeExcelCell('=SUM(1+1)')).toBe("'=SUM(1+1)");
    expect(sanitizeExcelCell('+123456')).toBe("'+123456");
    expect(sanitizeExcelCell('-cmd|calc')).toBe("'-cmd|calc");
    expect(sanitizeExcelCell('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)");
    expect(sanitizeExcelCell('\tformula')).toBe("'\tformula");
    expect(sanitizeExcelCell('Budi Santoso')).toBe('Budi Santoso');
    expect(sanitizeExcelCell(10000)).toBe(10000);

    const row = sanitizeExcelRow(['Budi', '=cmd', 5000]);
    expect(row).toEqual(['Budi', "'=cmd", 5000]);
  });

  it('SEC-09: Password complexity validation should reject weak passwords and accept strong ones', () => {
    // Weak: less than 8 chars
    const weakShort = userCreateSchema.safeParse({
      username: 'testuser1',
      name: 'Test User',
      password: 'Aa1!',
    });
    expect(weakShort.success).toBe(false);

    // Weak: no uppercase or no special/number
    const weakNoUpper = userCreateSchema.safeParse({
      username: 'testuser2',
      name: 'Test User',
      password: 'password123',
    });
    expect(weakNoUpper.success).toBe(false);

    // Strong: 8+ chars, upper, lower, number/symbol
    const strong = userCreateSchema.safeParse({
      username: 'testuser3',
      name: 'Test User',
      password: 'Password123!',
    });
    expect(strong.success).toBe(true);
  });

  it('SEC-05: Nasabah self update schema should not include NIK to preserve immutability', async () => {
    // Attempting to send NIK in nasabah self update
    const parsed = nasabahSelfUpdateSchema.safeParse({
      nik: '3201019999990001',
      name: 'Updated Name Mandiri',
      phone: '081299998888',
    });

    expect(parsed.success).toBe(true);
    // 'nik' is not a known key in nasabahSelfUpdateSchema, so it must not be in data
    expect((parsed as any).data.nik).toBeUndefined();

    // Send PUT /api/v1/me/nasabah with a fake new NIK
    const res = await app.request('/api/v1/me/nasabah', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nasabahToken}`,
      },
      body: JSON.stringify({
        nik: '9999999999999999',
        name: 'Nama Diperbarui Aman',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // NIK must remain the original registered NIK
    expect(String(json.data.nik)).toBe(String(nasabahNik));
    expect(json.data.name).toBe('Nama Diperbarui Aman');
  });

  it(
    'SEC-03: Rate Limiter should block excessive login attempts with HTTP 429',
    async () => {
      resetRateLimitStore();

      const clientHeaders = {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.42',
      };

      // Send 5 requests (under the limit of max: 5)
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/v1/auth/login', {
          method: 'POST',
          headers: clientHeaders,
          body: JSON.stringify({
            identifier: 'nonexistent_rate_test_user',
            password: 'AnyPassword123!',
          }),
        });
        expect(res.status).toBe(400); // Bad credentials
      }

      // 6th request must be rejected with 429 Too Many Requests
      const blockedRes = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: clientHeaders,
        body: JSON.stringify({
          identifier: 'nonexistent_rate_test_user',
          password: 'AnyPassword123!',
        }),
      });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
      const blockedJson = await blockedRes.json();
      expect(blockedJson.success).toBe(false);
      expect(blockedJson.error_code).toBe('TOO_MANY_REQUESTS');
    },
    15000
  );
});
