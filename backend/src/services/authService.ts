import { db } from '../core/database.js';
import {
  createAccessToken,
  createRefreshToken,
  decodeToken,
  hashPassword,
  verifyPassword,
} from '../core/security.js';
import { AppError } from '../utils/response.js';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '../schemas/auth.schema.js';
import { nasabahService } from './nasabahService.js';

export class AuthService {
  public static async register(data: RegisterInput) {
    const nasabah = await nasabahService.createNasabah(data as any, 'SELF');
    return { nasabah };
  }

  public static async findUserByIdentifier(identifier: string) {
    const cleanId = identifier.trim();

    // 1. Search directly by username
    const user = await db.fetchOne<any>('SELECT * FROM users WHERE username = ?', [cleanId]);
    if (user) return user;

    // 2. Search by nasabah customer_id, account_no, or NIK
    const userByNasabah = await db.fetchOne<any>(
      `SELECT u.* FROM users u
       JOIN nasabah n ON u.nasabah_id = n.id
       WHERE n.customer_id = ? OR n.account_no = ? OR n.nik = ?`,
      [cleanId, cleanId, cleanId]
    );
    return userByNasabah;
  }

  public static async login(data: LoginInput) {
    const user = await this.findUserByIdentifier(data.identifier);
    if (!user) {
      throw new AppError('ID/Nomor Rekening/NIK/Username atau password salah.', 400, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('ID/Nomor Rekening/NIK/Username atau password salah.', 400, 'INVALID_CREDENTIALS');
    }

    if (!user.is_active || user.status === 'INACTIVE') {
      throw new AppError('Akun Anda telah dinonaktifkan. Silakan hubungi petugas.', 403, 'ACCOUNT_INACTIVE');
    }

    let nasabahData = null;
    if (user.role === 'NASABAH' && user.nasabah_id) {
      nasabahData = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [user.nasabah_id]);
      if (!nasabahData) {
        throw new AppError('Data nasabah tidak ditemukan.', 400, 'NASABAH_NOT_FOUND');
      }
      if (nasabahData.status !== 'ACTIVE') {
        throw new AppError('Status nasabah nonaktif. Silakan hubungi admin.', 403, 'NASABAH_INACTIVE');
      }
      const balance = await nasabahService.getNasabahBalance(nasabahData.id);
      nasabahData.balance = balance;
    }

    await db.execute("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);

    const tokenPayload: Record<string, any> = {
      sub: user.id,
      role: user.role,
      username: user.username,
    };
    if (nasabahData) {
      tokenPayload.nasabah_id = nasabahData.id;
    }

    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(tokenPayload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        is_active: Boolean(user.is_active),
        nasabah: nasabahData,
      },
    };
  }

  public static async refreshToken(token: string) {
    const payload = await decodeToken(token);
    if (!payload || !payload.sub || payload.token_type !== 'refresh') {
      throw new AppError('Refresh token tidak valid atau kedaluwarsa.', 401, 'INVALID_TOKEN');
    }

    const user = await db.fetchOne<any>('SELECT * FROM users WHERE id = ?', [payload.sub]);
    if (!user || !user.is_active || user.status === 'INACTIVE') {
      throw new AppError('Pengguna tidak aktif.', 401, 'USER_INACTIVE');
    }

    const tokenPayload: Record<string, any> = {
      sub: user.id,
      role: user.role,
      username: user.username,
    };
    if (user.nasabah_id) {
      tokenPayload.nasabah_id = user.nasabah_id;
    }

    const newAccessToken = await createAccessToken(tokenPayload);
    const newRefreshToken = await createRefreshToken(tokenPayload);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
    };
  }

  public static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await db.fetchOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new AppError('Pengguna tidak ditemukan.', 404, 'NOT_FOUND');
    }

    const currentPlain = data.old_password || data.current_password;
    if (!currentPlain) {
      throw new AppError('Password saat ini wajib diisi.', 400, 'PASSWORD_REQUIRED');
    }

    const isMatch = await verifyPassword(currentPlain, user.password_hash);
    if (!isMatch) {
      throw new AppError('Password saat ini salah.', 400, 'PASSWORD_MISMATCH');
    }

    const newHash = await hashPassword(data.new_password);
    await db.execute(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newHash, userId]
    );

    return true;
  }
}

export const authService = AuthService;
