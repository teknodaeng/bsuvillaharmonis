import { Context, Next } from 'hono';
import { AppError } from '../utils/response.js';

export function requireRole(allowedRole: 'ADMIN' | 'NASABAH') {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      throw new AppError('Otentikasi diperlukan.', 401, 'UNAUTHORIZED');
    }

    if (user.role !== allowedRole) {
      throw new AppError('Anda tidak memiliki akses ke fitur ini.', 403, 'FORBIDDEN');
    }

    await next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireNasabah = requireRole('NASABAH');
