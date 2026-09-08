import { v4 as uuidv4 } from 'uuid';
import { db, TxExecutor } from '../core/database.js';
import { hashPassword } from '../core/security.js';
import { AppError } from '../utils/response.js';
import {
  NasabahCreateInput,
  NasabahUpdateInput,
} from '../schemas/nasabah.schema.js';

export class NasabahService {
  public static async generateNextAccountNumber(tx?: TxExecutor): Promise<string> {
    const executor = tx || db;
    let row = await executor.fetchOne('SELECT last_number FROM account_sequences WHERE id = 1');
    let lastNumber = -1;
    if (!row) {
      await executor.execute('INSERT INTO account_sequences (id, last_number) VALUES (1, -1)');
    } else {
      lastNumber = Number(row.last_number);
    }

    const nextNumber = lastNumber + 1;
    if (nextNumber > 9999) {
      throw new AppError(
        'Kapasitas nomor rekening bsuvh0000-bsuvh9999 telah habis. Silakan hubungi pengembang sistem.',
        500,
        'ACCOUNT_CAPACITY_EXCEEDED'
      );
    }

    await executor.execute('UPDATE account_sequences SET last_number = ? WHERE id = 1', [
      nextNumber,
    ]);
    return `bsuvh${String(nextNumber).padStart(4, '0')}`;
  }

  public static async getNasabahBalance(nasabahId: string, tx?: TxExecutor): Promise<number> {
    const executor = tx || db;
    const balanceRow = await executor.fetchOne<any>(
      `SELECT COALESCE(SUM(credit) - SUM(debit), 0) as balance
       FROM transactions
       WHERE nasabah_id = ?`,
      [nasabahId]
    );
    return balanceRow ? Number(balanceRow.balance) : 0;
  }

  public static async createNasabah(
    data: NasabahCreateInput,
    registrationSource: 'SELF' | 'ADMIN' = 'SELF',
    creatorId: string | null = null
  ) {
    const existingNik = await db.fetchOne('SELECT id FROM nasabah WHERE nik = ?', [data.nik]);
    if (existingNik) {
      throw new AppError('NIK sudah terdaftar dalam sistem.', 400, 'NIK_EXISTS');
    }

    const nasabahId = uuidv4();
    const userId = uuidv4();
    const hashedPassword = await hashPassword(data.password);

    return await db.transaction(async (tx) => {
      const accountNo = await this.generateNextAccountNumber(tx);

      await tx.execute({
        sql: `INSERT INTO nasabah (
          id, customer_id, account_no, nik, name, phone, address,
          rt, rw, kelurahan, kecamatan, kabupaten_kota, nasabah_category, email,
          status, registration_source, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        args: [
          nasabahId,
          accountNo,
          accountNo,
          data.nik,
          data.name,
          data.phone,
          data.address,
          data.rt || null,
          data.rw || null,
          data.kelurahan || null,
          data.kecamatan || null,
          data.kabupaten_kota || null,
          data.nasabah_category || 'Rumah Tangga/Individu',
          data.email || null,
          registrationSource,
          creatorId,
          creatorId,
        ],
      });

      await tx.execute({
        sql: `INSERT INTO users (
          id, username, name, email, phone, password_hash, role, nasabah_id, status, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'NASABAH', ?, 'ACTIVE', 1, ?)`,
        args: [
          userId,
          accountNo,
          data.name,
          data.email || null,
          data.phone,
          hashedPassword,
          nasabahId,
          creatorId || 'SELF',
        ],
      });

      return {
        id: nasabahId,
        customer_id: accountNo,
        account_no: accountNo,
        nik: data.nik,
        name: data.name,
        phone: data.phone,
        address: data.address,
        rt: data.rt || null,
        rw: data.rw || null,
        kelurahan: data.kelurahan || null,
        kecamatan: data.kecamatan || null,
        kabupaten_kota: data.kabupaten_kota || null,
        nasabah_category: data.nasabah_category || 'Rumah Tangga/Individu',
        email: data.email || null,
        status: 'ACTIVE',
        registration_source: registrationSource,
        balance: 0,
      };
    });
  }

  public static async listNasabah(params: {
    search?: string;
    status?: string;
    category?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: any[] = [];

    if (params.search) {
      const s = `%${params.search.trim()}%`;
      conditions.push(
        '(name LIKE ? OR nik LIKE ? OR customer_id LIKE ? OR phone LIKE ? OR kelurahan LIKE ? OR kecamatan LIKE ?)'
      );
      args.push(s, s, s, s, s, s);
    }

    if (params.status) {
      conditions.push('status = ?');
      args.push(params.status);
    }

    if (params.category) {
      conditions.push('nasabah_category = ?');
      args.push(params.category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total FROM nasabah ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT * FROM nasabah ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    // Calculate balances for each nasabah
    const items = await Promise.all(
      rows.map(async (row) => {
        const balance = await this.getNasabahBalance(row.id);
        return {
          ...row,
          balance,
        };
      })
    );

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  public static async getNasabahById(id: string) {
    const nasabah = await db.fetchOne<any>(
      'SELECT * FROM nasabah WHERE id = ? OR customer_id = ? OR account_no = ? OR nik = ?',
      [id, id, id, id]
    );
    if (!nasabah) {
      throw new AppError('Data nasabah tidak ditemukan.', 404, 'NOT_FOUND');
    }
    const balance = await this.getNasabahBalance(nasabah.id);
    return {
      ...nasabah,
      balance,
    };
  }

  public static async updateNasabah(id: string, data: NasabahUpdateInput, updatedBy?: string) {
    const existing = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Data nasabah tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (data.nik && data.nik !== existing.nik) {
      const duplicateNik = await db.fetchOne('SELECT id FROM nasabah WHERE nik = ? AND id != ?', [
        data.nik,
        id,
      ]);
      if (duplicateNik) {
        throw new AppError('NIK sudah digunakan oleh nasabah lain.', 400, 'NIK_EXISTS');
      }
    }

    const updates: string[] = [];
    const args: any[] = [];

    const fields: (keyof NasabahUpdateInput)[] = [
      'nik',
      'name',
      'phone',
      'address',
      'rt',
      'rw',
      'kelurahan',
      'kecamatan',
      'kabupaten_kota',
      'nasabah_category',
      'email',
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        args.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return await this.getNasabahById(id);
    }

    updates.push("updated_at = datetime('now')");
    if (updatedBy) {
      updates.push('updated_by = ?');
      args.push(updatedBy);
    }

    args.push(id);
    await db.execute(`UPDATE nasabah SET ${updates.join(', ')} WHERE id = ?`, args);

    // Sync name and phone with associated user account if updated
    if (data.name || data.phone || data.email) {
      const userUpdates: string[] = [];
      const userArgs: any[] = [];
      if (data.name) {
        userUpdates.push('name = ?');
        userArgs.push(data.name);
      }
      if (data.phone) {
        userUpdates.push('phone = ?');
        userArgs.push(data.phone);
      }
      if (data.email !== undefined) {
        userUpdates.push('email = ?');
        userArgs.push(data.email);
      }
      if (userUpdates.length > 0) {
        userArgs.push(id);
        await db.execute(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE nasabah_id = ?`,
          userArgs
        );
      }
    }

    return await this.getNasabahById(id);
  }

  public static async updateNasabahStatus(id: string, status: 'ACTIVE' | 'INACTIVE', updatedBy?: string) {
    const existing = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Data nasabah tidak ditemukan.', 404, 'NOT_FOUND');
    }

    await db.transaction(async (tx) => {
      await tx.execute({
        sql: `UPDATE nasabah SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`,
        args: [status, updatedBy || null, id],
      });

      const isActive = status === 'ACTIVE' ? 1 : 0;
      await tx.execute({
        sql: `UPDATE users SET status = ?, is_active = ?, updated_at = datetime('now') WHERE nasabah_id = ?`,
        args: [status, isActive, id],
      });
    });

    return await this.getNasabahById(id);
  }

  public static async getNasabahTransactions(
    nasabahId: string,
    params: { page?: number; page_size?: number; type?: string }
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['t.nasabah_id = ?'];
    const args: any[] = [nasabahId];

    if (params.type) {
      conditions.push('t.type = ?');
      args.push(params.type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT t.*, 
              c.name as category_name,
              p.group_name as price_group_name,
              p.price_code as price_code
       FROM transactions t
       LEFT JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
       ${whereClause}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    const items = rows.map((row) => {
      let category = null;
      if (row.category_id || row.price_id) {
        const groupName = row.price_group_name;
        const catName = row.category_name || 'Sampah';
        const displayName = groupName ? `[${groupName}] ${catName}` : catName;
        category = {
          id: row.category_id || '',
          name: displayName,
          group_name: groupName,
          price_code: row.price_code,
        };
      }

      return {
        ...row,
        weight_kg: row.weight_gram !== null ? row.weight_gram / 1000.0 : null,
        category,
      };
    });

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }
}

export const nasabahService = NasabahService;
