import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { AppError } from '../utils/response.js';
import { TransactionCreateInput } from '../schemas/transaction.schema.js';
import { nasabahService } from './nasabahService.js';
import { priceService } from './priceService.js';
import { formatRupiah } from '../utils/currency.js';

export class TransactionService {
  public static async generateTransactionNo(tx: any, txDateStr?: string): Promise<string> {
    let parsed: Date;
    try {
      parsed = txDateStr ? new Date(txDateStr) : new Date();
      if (isNaN(parsed.getTime())) parsed = new Date();
    } catch {
      parsed = new Date();
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    const searchPattern = `TRX-${datePrefix}-%`;

    const row = await tx.fetchOne(
      'SELECT transaction_no FROM transactions WHERE transaction_no LIKE ? ORDER BY transaction_no DESC LIMIT 1',
      [searchPattern]
    );

    let nextNum = 1;
    if (row && row.transaction_no) {
      const parts = row.transaction_no.split('-');
      if (parts.length >= 3 && !isNaN(Number(parts[2]))) {
        nextNum = Number(parts[2]) + 1;
      }
    }

    return `TRX-${datePrefix}-${String(nextNum).padStart(4, '0')}`;
  }

  public static async getTransactionById(id: string, executor: any = db) {
    const tx = await executor.fetchOne(
      `SELECT t.*, 
              n.customer_id as nasabah_customer_id, 
              n.name as nasabah_name, 
              n.nik as nasabah_nik,
              n.phone as nasabah_phone,
              n.address as nasabah_address,
              c.name as category_name,
              p.group_name as price_group_name,
              p.price_code as price_code,
              p.example_items as price_example_items
       FROM transactions t
       JOIN nasabah n ON t.nasabah_id = n.id
       LEFT JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
       WHERE t.id = ?`,
      [id]
    );

    if (!tx) {
      throw new AppError('Transaksi tidak ditemukan.', 404, 'NOT_FOUND');
    }

    let category = null;
    if (tx.category_id || tx.price_id) {
      const groupName = tx.price_group_name;
      const catName = tx.category_name || 'Sampah';
      const displayName = groupName ? `[${groupName}] ${catName}` : catName;
      category = {
        id: tx.category_id || '',
        name: displayName,
        group_name: groupName,
        price_code: tx.price_code,
      };
    }

    return {
      ...tx,
      weight_kg: tx.weight_gram !== null ? tx.weight_gram / 1000.0 : null,
      category,
    };
  }

  public static async createTransaction(data: TransactionCreateInput, creatorId?: string) {
    // 1. Check idempotency key if provided
    if (data.idempotency_key) {
      const existingTx = await db.fetchOne<any>(
        'SELECT id FROM transactions WHERE idempotency_key = ?',
        [data.idempotency_key]
      );
      if (existingTx) {
        return await this.getTransactionById(existingTx.id);
      }
    }

    // 2. Validate nasabah
    const nasabah = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [data.nasabah_id]);
    if (!nasabah) {
      throw new AppError('Nasabah tidak ditemukan.', 404, 'NOT_FOUND');
    }
    if (nasabah.status !== 'ACTIVE') {
      throw new AppError('Transaksi ditolak. Status nasabah nonaktif.', 400, 'NASABAH_INACTIVE');
    }

    const txDate = data.transaction_date || new Date().toISOString();

    const txId = uuidv4();
    let categoryId: string | null = null;
    let priceId: string | null = null;
    let weightGram: number | null = null;
    let pricePerKg: number | null = null;
    let amount: number;
    let credit: number;
    let debit: number;

    if (data.type === 'SETOR') {
      if (data.price_id) {
        const priceRec = await priceService.getPriceById(data.price_id);
        if (priceRec.status !== 'ACTIVE') {
          throw new AppError(
            'Master harga sampah yang dipilih sedang tidak aktif.',
            400,
            'PRICE_INACTIVE'
          );
        }
        pricePerKg = Number(priceRec.price_per_kg);
        categoryId = priceRec.category_id;
        priceId = priceRec.id;
      } else if (data.category_id) {
        const activePrice = await priceService.getActivePriceByCategory(data.category_id);
        pricePerKg = Number(activePrice.price_per_kg);
        categoryId = data.category_id;
        priceId = activePrice.id;
      } else {
        throw new AppError(
          'Kelompok sampah atau harga sampah wajib dipilih untuk transaksi SETOR.',
          400,
          'PRICE_REQUIRED'
        );
      }

      if (!data.weight_kg || data.weight_kg <= 0) {
        throw new AppError('Berat sampah harus lebih dari 0 kg.', 400, 'INVALID_WEIGHT');
      }

      weightGram = Math.round(data.weight_kg * 1000);
      amount = Math.round(data.weight_kg * pricePerKg);
      credit = amount;
      debit = 0;
    } else if (data.type === 'TARIK') {
      if (!data.amount || data.amount <= 0) {
        throw new AppError('Nominal tarik tunai harus lebih dari 0.', 400, 'INVALID_AMOUNT');
      }
      amount = data.amount;
      debit = amount;
      credit = 0;
    } else {
      throw new AppError('Jenis transaksi tidak valid.', 400, 'INVALID_TYPE');
    }

    await db.transaction(async (tx) => {
      // Hitung saldo secara atomik di dalam transaksi basis data
      const currentBalance = await nasabahService.getNasabahBalance(data.nasabah_id, tx);
      let balanceAfter: number;

      if (data.type === 'SETOR') {
        balanceAfter = currentBalance + credit;
      } else {
        if (currentBalance < debit) {
          throw new AppError(
            `Saldo tidak mencukupi. Saldo saat ini: ${formatRupiah(currentBalance)}`,
            400,
            'INSUFFICIENT_BALANCE'
          );
        }
        balanceAfter = currentBalance - debit;
      }

      const txNo = await this.generateTransactionNo(tx, txDate);

      await tx.execute({
        sql: `INSERT INTO transactions (
          id, transaction_no, nasabah_id, transaction_date, type, category_id, price_id,
          weight_gram, price_per_kg, amount, debit, credit, balance_after,
          notes, idempotency_key, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          txId,
          txNo,
          data.nasabah_id,
          txDate,
          data.type,
          categoryId,
          priceId,
          weightGram,
          pricePerKg,
          amount,
          debit,
          credit,
          balanceAfter,
          data.notes || null,
          data.idempotency_key || null,
          creatorId || 'ADMIN',
        ],
      });
    });

    return await this.getTransactionById(txId);
  }

  public static async listTransactions(params: {
    nasabah_id?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
    category_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.page_size) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const args: any[] = [];

    if (params.nasabah_id) {
      conditions.push('t.nasabah_id = ?');
      args.push(params.nasabah_id);
    }

    if (params.start_date) {
      conditions.push('date(t.transaction_date) >= date(?)');
      args.push(params.start_date);
    }

    if (params.end_date) {
      conditions.push('date(t.transaction_date) <= date(?)');
      args.push(params.end_date);
    }

    if (params.type) {
      conditions.push('t.type = ?');
      args.push(params.type);
    }

    if (params.category_id) {
      conditions.push('t.category_id = ?');
      args.push(params.category_id);
    }

    if (params.search) {
      const s = `%${params.search.trim()}%`;
      conditions.push(
        '(t.transaction_no LIKE ? OR n.name LIKE ? OR n.customer_id LIKE ? OR n.nik LIKE ? OR p.group_name LIKE ? OR c.name LIKE ?)'
      );
      args.push(s, s, s, s, s, s);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total
       FROM transactions t
       JOIN nasabah n ON t.nasabah_id = n.id
       LEFT JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
       WHERE ${whereClause}`,
      args
    );
    const totalItems = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const rows = await db.fetchAll<any>(
      `SELECT t.*, 
              n.customer_id as nasabah_customer_id, 
              n.name as nasabah_name, 
              n.nik as nasabah_nik,
              c.name as category_name,
              p.group_name as price_group_name,
              p.price_code as price_code
       FROM transactions t
       JOIN nasabah n ON t.nasabah_id = n.id
       LEFT JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
       WHERE ${whereClause}
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

export const transactionService = TransactionService;
