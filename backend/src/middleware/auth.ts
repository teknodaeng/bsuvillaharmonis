import { Context, Next } from 'hono';
import { decodeToken } from '../core/security.js';
import { db } from '../core/database.js';
import { AppError } from '../utils/response.js';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Token otentikasi tidak ditemukan.', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7).trim();
  const payload = await decodeToken(token);

  if (!payload || !payload.sub) {
    throw new AppError('Token tidak valid atau telah kedaluwarsa.', 401, 'UNAUTHORIZED');
  }

  const user = await db.fetchOne<any>('SELECT * FROM users WHERE id = ?', [payload.sub]);
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 401, 'UNAUTHORIZED');
  }

  if (!user.is_active || user.status === 'INACTIVE') {
    throw new AppError('Akun Anda telah dinonaktifkan.', 403, 'FORBIDDEN');
  }

  if (user.role === 'NASABAH' && user.nasabah_id) {
    const nasabah = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [user.nasabah_id]);
    if (nasabah) {
      user.nasabah = nasabah;
      if (nasabah.status !== 'ACTIVE') {
        throw new AppError('Status nasabah nonaktif. Silakan hubungi admin.', 403, 'FORBIDDEN');
      }
    }
  }

  c.set('user', user);
  await next();
}
