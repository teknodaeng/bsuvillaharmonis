import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { AppError } from '../utils/response.js';
import {
  CategoryCreateInput,
  CategoryUpdateInput,
} from '../schemas/category.schema.js';

export class CategoryService {
  public static async listCategories(params: {
    active_only?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 50));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: any[] = [];

    if (params.active_only) {
      conditions.push('is_active = 1');
    }

    if (params.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const s = `%${params.search.trim()}%`;
      args.push(s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total FROM waste_categories ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT * FROM waste_categories ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return {
      items: rows.map((r) => ({ ...r, is_active: Boolean(r.is_active) })),
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  public static async getCategoryById(id: string) {
    const category = await db.fetchOne<any>(
      'SELECT * FROM waste_categories WHERE id = ?',
      [id]
    );
    if (!category) {
      throw new AppError('Kategori sampah tidak ditemukan.', 404, 'NOT_FOUND');
    }
    return { ...category, is_active: Boolean(category.is_active) };
  }

  public static async createCategory(data: CategoryCreateInput, creatorId?: string) {
    const existing = await db.fetchOne(
      'SELECT id FROM waste_categories WHERE name = ?',
      [data.name]
    );
    if (existing) {
      throw new AppError('Kategori dengan nama tersebut sudah ada.', 400, 'CATEGORY_EXISTS');
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO waste_categories (id, name, description, is_active, created_by)
       VALUES (?, ?, ?, 1, ?)`,
      [id, data.name, data.description || null, creatorId || 'SYSTEM']
    );

    return await this.getCategoryById(id);
  }

  public static async updateCategory(id: string, data: CategoryUpdateInput, updatedBy?: string) {
    const existing = await db.fetchOne<any>(
      'SELECT * FROM waste_categories WHERE id = ?',
      [id]
    );
    if (!existing) {
      throw new AppError('Kategori sampah tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await db.fetchOne(
        'SELECT id FROM waste_categories WHERE name = ? AND id != ?',
        [data.name, id]
      );
      if (duplicate) {
        throw new AppError('Kategori dengan nama tersebut sudah ada.', 400, 'CATEGORY_EXISTS');
      }
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      args.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      args.push(data.description);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.getCategoryById(id);
    }

    updates.push("updated_at = datetime('now')");
    if (updatedBy) {
      updates.push('updated_by = ?');
      args.push(updatedBy);
    }

    args.push(id);
    await db.execute(`UPDATE waste_categories SET ${updates.join(', ')} WHERE id = ?`, args);

    return await this.getCategoryById(id);
  }

  public static async updateCategoryStatus(id: string, isActive: boolean, updatedBy?: string) {
    const existing = await db.fetchOne<any>(
      'SELECT id FROM waste_categories WHERE id = ?',
      [id]
    );
    if (!existing) {
      throw new AppError('Kategori sampah tidak ditemukan.', 404, 'NOT_FOUND');
    }

    await db.execute(
      `UPDATE waste_categories SET is_active = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`,
      [isActive ? 1 : 0, updatedBy || null, id]
    );

    return await this.getCategoryById(id);
  }

  public static async deleteCategory(id: string) {
    const existing = await db.fetchOne<any>(
      'SELECT id FROM waste_categories WHERE id = ?',
      [id]
    );
    if (!existing) {
      throw new AppError('Kategori sampah tidak ditemukan.', 404, 'NOT_FOUND');
    }

    // Check if category is referenced in transactions
    const tx = await db.fetchOne('SELECT id FROM transactions WHERE category_id = ? LIMIT 1', [id]);
    if (tx) {
      throw new AppError('Kategori tidak dapat dihapus karena telah memiliki riwayat transaksi.', 400, 'CATEGORY_IN_USE');
    }

    await db.execute('DELETE FROM waste_price_masters WHERE category_id = ?', [id]);
    await db.execute('DELETE FROM waste_categories WHERE id = ?', [id]);
    return true;
  }
}

export const categoryService = CategoryService;
