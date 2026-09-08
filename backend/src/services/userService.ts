import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { hashPassword } from '../core/security.js';
import { AppError } from '../utils/response.js';
import {
  UserCreateInput,
  UserUpdateInput,
} from '../schemas/user.schema.js';

export class UserService {
  public static async listUsers(params: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: any[] = [];

    if (params.role) {
      conditions.push('role = ?');
      args.push(params.role);
    }

    if (params.status) {
      conditions.push('status = ?');
      args.push(params.status);
    }

    if (params.search) {
      const s = `%${params.search.trim()}%`;
      conditions.push('(username LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      args.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT id, username, name, email, phone, role, status, is_active, nasabah_id, last_login_at, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return {
      items: rows.map((u) => ({ ...u, is_active: Boolean(u.is_active) })),
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  public static async getUserById(id: string) {
    const user = await db.fetchOne<any>(
      `SELECT id, username, name, email, phone, role, status, is_active, nasabah_id, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    if (!user) {
      throw new AppError('Pengguna tidak ditemukan.', 404, 'NOT_FOUND');
    }
    return { ...user, is_active: Boolean(user.is_active) };
  }

  public static async createUser(data: UserCreateInput, creatorId?: string) {
    const existing = await db.fetchOne('SELECT id FROM users WHERE username = ?', [data.username]);
    if (existing) {
      throw new AppError('Username telah digunakan.', 400, 'USERNAME_EXISTS');
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(data.password);
    const isActive = data.status === 'ACTIVE' ? 1 : 0;

    await db.execute(
      `INSERT INTO users (id, username, name, email, phone, password_hash, role, status, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.username,
        data.name,
        data.email || null,
        data.phone || null,
        hashedPassword,
        data.role,
        data.status,
        isActive,
        creatorId || 'SYSTEM',
      ]
    );

    return await this.getUserById(userId);
  }

  public static async updateUser(id: string, data: UserUpdateInput, updatedBy?: string) {
    const existing = await db.fetchOne<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (data.username && data.username !== existing.username) {
      const duplicate = await db.fetchOne('SELECT id FROM users WHERE username = ? AND id != ?', [
        data.username,
        id,
      ]);
      if (duplicate) {
        throw new AppError('Username telah digunakan.', 400, 'USERNAME_EXISTS');
      }
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      args.push(data.username);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      args.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      args.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      args.push(data.phone);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      args.push(data.role);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      args.push(data.status);
      updates.push('is_active = ?');
      args.push(data.status === 'ACTIVE' ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.getUserById(id);
    }

    updates.push("updated_at = datetime('now')");
    if (updatedBy) {
      updates.push('updated_by = ?');
      args.push(updatedBy);
    }

    args.push(id);
    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, args);

    return await this.getUserById(id);
  }

  public static async updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE', updatedBy?: string) {
    const existing = await db.fetchOne<any>('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404, 'NOT_FOUND');
    }

    const isActive = status === 'ACTIVE' ? 1 : 0;
    await db.execute(
      `UPDATE users SET status = ?, is_active = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`,
      [status, isActive, updatedBy || null, id]
    );

    return await this.getUserById(id);
  }

  public static async resetUserPassword(id: string, newPassword: string, updatedBy?: string) {
    const existing = await db.fetchOne<any>('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Pengguna tidak ditemukan.', 404, 'NOT_FOUND');
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.execute(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`,
      [hashedPassword, updatedBy || null, id]
    );

    return true;
  }
}

export const userService = UserService;
