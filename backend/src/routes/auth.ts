import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { authService } from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../schemas/auth.schema.js';

export const authRouter = new Hono<AppEnv>();

const loginLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.',
});

const registerLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Terlalu banyak permintaan registrasi dari alamat IP ini. Silakan tunggu beberapa saat.',
});

// POST /api/v1/auth/register
authRouter.post('/register', registerLimiter, validateJson(registerSchema), async (c) => {
  const data = c.req.valid('json' as any);
  const result = await authService.register(data);
  return successResponse(
    c,
    result,
    'Registrasi berhasil. Silakan login menggunakan ID Nasabah atau NIK Anda.',
    201
  );
});

// POST /api/v1/auth/login
authRouter.post('/login', loginLimiter, validateJson(loginSchema), async (c) => {
  const data = c.req.valid('json' as any);
  const result = await authService.login(data);
  return successResponse(c, result, 'Login berhasil.');
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', validateJson(refreshTokenSchema), async (c) => {
  const data = c.req.valid('json' as any);
  const result = await authService.refreshToken(data.refresh_token);
  return successResponse(c, result, 'Token berhasil diperbarui.');
});

// POST /api/v1/auth/logout
authRouter.post('/logout', authMiddleware, async (c) => {
  return successResponse(c, null, 'Logout berhasil.');
});

// GET /api/v1/auth/me
authRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return successResponse(
    c,
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      is_active: Boolean(user.is_active),
      nasabah: user.nasabah || null,
    },
    'Data pengguna berhasil dimuat.'
  );
});

// POST /api/v1/auth/change-password
authRouter.post('/change-password', authMiddleware, validateJson(changePasswordSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  await authService.changePassword(user.id, data);
  return successResponse(c, null, 'Password berhasil diubah.');
});
