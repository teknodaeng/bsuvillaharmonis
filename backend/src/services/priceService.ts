import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { AppError } from '../utils/response.js';
import {
  PriceCreateInput,
  PriceUpdateInput,
} from '../schemas/price.schema.js';

export class PriceService {
  public static async listPrices(params: {
    category_id?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const args: any[] = [];

    if (params.category_id) {
      conditions.push('p.category_id = ?');
      args.push(params.category_id);
    }

    if (params.status) {
      conditions.push('p.status = ?');
      args.push(params.status);
    }

    if (params.search) {
      const s = `%${params.search.trim()}%`;
      conditions.push(
        '(c.name LIKE ? OR p.group_name LIKE ? OR p.example_items LIKE ? OR p.price_code LIKE ? OR p.notes LIKE ?)'
      );
      args.push(s, s, s, s, s);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total
       FROM waste_price_masters p
       JOIN waste_categories c ON p.category_id = c.id
       WHERE ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT p.*, c.name as category_name
       FROM waste_price_masters p
       JOIN waste_categories c ON p.category_id = c.id
       WHERE ${whereClause}
       ORDER BY CASE WHEN UPPER(p.status) = 'ACTIVE' THEN 1 ELSE 2 END ASC, c.name ASC, p.price_code ASC, p.group_name ASC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return {
      items: rows,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  public static async getPriceById(id: string) {
    const price = await db.fetchOne<any>(
      `SELECT p.*, c.name as category_name
       FROM waste_price_masters p
       JOIN waste_categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (!price) {
      throw new AppError('Master harga tidak ditemukan.', 404, 'NOT_FOUND');
    }
    return price;
  }

  public static async getActivePriceByCategory(categoryId: string) {
    const price = await db.fetchOne<any>(
      `SELECT p.*, c.name as category_name
       FROM waste_price_masters p
       JOIN waste_categories c ON p.category_id = c.id
       WHERE p.category_id = ? AND p.status = 'ACTIVE' AND c.is_active = 1
       ORDER BY p.effective_date DESC, p.created_at DESC
       LIMIT 1`,
      [categoryId]
    );
    if (!price) {
      throw new AppError('Harga aktif untuk kategori sampah ini tidak ditemukan.', 404, 'NOT_FOUND');
    }
    return price;
  }

  public static async getPriceHistories(priceId: string) {
    await this.getPriceById(priceId);

    const rows = await db.fetchAll<any>(
      `SELECT h.*, c.name as category_name, u.name as creator_name
       FROM waste_price_histories h
       LEFT JOIN waste_categories c ON h.category_id = c.id
       LEFT JOIN users u ON h.created_by = u.id
       WHERE h.price_id = ?
       ORDER BY h.created_at DESC, h.rowid DESC`,
      [priceId]
    );

    return rows;
  }

  public static async createPrice(data: PriceCreateInput, creatorId?: string) {
    const category = await db.fetchOne<any>(
      'SELECT * FROM waste_categories WHERE id = ?',
      [data.category_id]
    );
    if (!category) {
      throw new AppError('Kategori sampah tidak ditemukan.', 404, 'NOT_FOUND');
    }
    if (!category.is_active) {
      throw new AppError('Tidak dapat menetapkan harga untuk kategori yang nonaktif.', 400, 'CATEGORY_INACTIVE');
    }

    const priceId = uuidv4();
    const effectiveDate = data.effective_date || new Date().toISOString().slice(0, 10);
    const statusVal = data.status || 'ACTIVE';
    const unitVal = data.unit || 'kg';

    await db.transaction(async (tx) => {
      await tx.execute({
        sql: `INSERT INTO waste_price_masters (
          id, category_id, price_per_kg, price_code, group_name, example_items, unit, effective_date, status, notes, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          priceId,
          data.category_id,
          data.price_per_kg,
          data.price_code || null,
          data.group_name || null,
          data.example_items || null,
          unitVal,
          effectiveDate,
          statusVal,
          data.notes || null,
          creatorId || 'ADMIN',
          creatorId || 'ADMIN',
        ],
      });

      const historyId = uuidv4();
      await tx.execute({
        sql: `INSERT INTO waste_price_histories (
          id, price_id, category_id, price_per_kg, status, effective_date, action, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'CREATE', ?, ?)`,
        args: [
          historyId,
          priceId,
          data.category_id,
          data.price_per_kg,
          statusVal,
          effectiveDate,
          data.notes || null,
          creatorId || 'ADMIN',
        ],
      });
    });

    return await this.getPriceById(priceId);
  }

  public static async updatePrice(id: string, data: PriceUpdateInput, updaterId?: string) {
    const existing = await this.getPriceById(id);

    const categoryId = data.category_id !== undefined ? data.category_id : existing.category_id;
    if (data.category_id !== undefined && data.category_id !== existing.category_id) {
      const cat = await db.fetchOne('SELECT id FROM waste_categories WHERE id = ?', [data.category_id]);
      if (!cat) {
        throw new AppError('Kategori sampah tujuan tidak ditemukan.', 404, 'NOT_FOUND');
      }
    }

    const pricePerKg = data.price_per_kg !== undefined ? data.price_per_kg : existing.price_per_kg;
    const priceCode = data.price_code !== undefined ? data.price_code : existing.price_code;
    const groupName = data.group_name !== undefined ? data.group_name : existing.group_name;
    const exampleItems = data.example_items !== undefined ? data.example_items : existing.example_items;
    const unitVal = data.unit !== undefined ? data.unit : existing.unit || 'kg';
    const effectiveDate = data.effective_date !== undefined ? data.effective_date : existing.effective_date;
    const statusVal = data.status !== undefined ? data.status : existing.status;
    const notes = data.notes !== undefined ? data.notes : existing.notes;

    await db.transaction(async (tx) => {
      await tx.execute({
        sql: `UPDATE waste_price_masters
              SET category_id = ?, price_per_kg = ?, price_code = ?, group_name = ?, example_items = ?, unit = ?, effective_date = ?, status = ?, notes = ?, updated_by = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          categoryId,
          pricePerKg,
          priceCode,
          groupName,
          exampleItems,
          unitVal,
          effectiveDate,
          statusVal,
          notes,
          updaterId || 'ADMIN',
          id,
        ],
      });

      const historyId = uuidv4();
      await tx.execute({
        sql: `INSERT INTO waste_price_histories (
          id, price_id, category_id, price_per_kg, status, effective_date, action, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'UPDATE', ?, ?)`,
        args: [
          historyId,
          id,
          categoryId,
          pricePerKg,
          statusVal,
          effectiveDate,
          notes,
          updaterId || 'ADMIN',
        ],
      });
    });

    return await this.getPriceById(id);
  }

  public static async updatePriceStatus(id: string, statusVal: 'ACTIVE' | 'INACTIVE', updaterId?: string) {
    return await this.updatePrice(id, { status: statusVal }, updaterId);
  }

  public static async deletePrice(id: string) {
    await this.getPriceById(id);

    const tx = await db.fetchOne('SELECT id FROM transactions WHERE price_id = ? LIMIT 1', [id]);
    if (tx) {
      throw new AppError('Master harga tidak dapat dihapus karena telah memiliki riwayat transaksi.', 400, 'PRICE_IN_USE');
    }

    await db.execute('DELETE FROM waste_price_histories WHERE price_id = ?', [id]);
    await db.execute('DELETE FROM waste_price_masters WHERE id = ?', [id]);
    return true;
  }
}

export const priceService = PriceService;
