import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { AppError } from '../utils/response.js';
import { nasabahService } from './nasabahService.js';
import { TransactionService } from './transactionService.js';
import { formatRupiah } from '../utils/currency.js';
import { formatToLocalSqlDateTime } from '../utils/formatting.js';
import {
  WithdrawalRequestCreateInput,
  WithdrawalApproveInput,
  WithdrawalRejectInput,
} from '../schemas/withdrawal.schema.js';

export interface WithdrawalListParams {
  nasabah_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export class WithdrawalService {
  public static async generateRequestNo(executor: any = db): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    const searchPattern = `WD-${datePrefix}-%`;

    const row = await executor.fetchOne(
      'SELECT request_no FROM withdrawal_requests WHERE request_no LIKE ? ORDER BY request_no DESC LIMIT 1',
      [searchPattern]
    );

    let nextNum = 1;
    if (row && row.request_no) {
      const parts = row.request_no.split('-');
      if (parts.length >= 3 && !isNaN(Number(parts[2]))) {
        nextNum = Number(parts[2]) + 1;
      }
    }

    return `WD-${datePrefix}-${String(nextNum).padStart(4, '0')}`;
  }

  public static async getRequestById(id: string, executor: any = db) {
    const item = await executor.fetchOne(
      `SELECT wr.*,
              n.customer_id as nasabah_customer_id,
              n.account_no as nasabah_account_no,
              n.name as nasabah_name,
              n.phone as nasabah_phone,
              n.address as nasabah_address,
              n.status as nasabah_status,
              u_app.name as approver_name,
              u_rej.name as rejector_name,
              t.transaction_no as transaction_no,
              t.balance_after as transaction_balance_after
       FROM withdrawal_requests wr
       JOIN nasabah n ON wr.nasabah_id = n.id
       LEFT JOIN users u_app ON wr.approved_by = u_app.id
       LEFT JOIN users u_rej ON wr.rejected_by = u_rej.id
       LEFT JOIN transactions t ON wr.transaction_id = t.id
       WHERE wr.id = ?`,
      [id]
    );

    if (!item) {
      throw new AppError('Permohonan penarikan saldo tidak ditemukan.', 404, 'NOT_FOUND');
    }

    return {
      ...item,
      amount_formatted: formatRupiah(item.amount),
    };
  }

  public static async createRequest(nasabahId: string, data: WithdrawalRequestCreateInput) {
    // 1. Validasi nasabah
    const nasabah = await db.fetchOne<any>('SELECT * FROM nasabah WHERE id = ?', [nasabahId]);
    if (!nasabah) {
      throw new AppError('Data nasabah tidak ditemukan.', 404, 'NOT_FOUND');
    }
    if (nasabah.status !== 'ACTIVE') {
      throw new AppError(
        'Permohonan ditolak. Status akun nasabah tidak aktif.',
        400,
        'NASABAH_INACTIVE'
      );
    }

    // 2. Cek saldo nasabah saat ini
    const currentBalance = await nasabahService.getNasabahBalance(nasabahId);
    if (currentBalance <= 0) {
      throw new AppError(
        'Saldo tabungan Anda saat ini Rp 0. Anda belum dapat mengajukan penarikan.',
        400,
        'ZERO_BALANCE'
      );
    }

    // 3. Cek total permohonan yang masih PENDING (agar tidak melebihi saldo)
    const pendingRow = await db.fetchOne<any>(
      `SELECT COALESCE(SUM(amount), 0) as pending_total
       FROM withdrawal_requests
       WHERE nasabah_id = ? AND status = 'PENDING'`,
      [nasabahId]
    );
    const pendingTotal = pendingRow ? Number(pendingRow.pending_total) : 0;
    const availableBalance = currentBalance - pendingTotal;

    if (data.amount > availableBalance) {
      if (availableBalance <= 0) {
        throw new AppError(
          `Semua saldo Anda (${formatRupiah(currentBalance)}) sedang dalam proses permohonan penarikan yang menunggu persetujuan admin.`,
          400,
          'INSUFFICIENT_AVAILABLE_BALANCE'
        );
      }
      throw new AppError(
        `Nominal penarikan (${formatRupiah(data.amount)}) melebihi sisa saldo Anda yang tersedia (${formatRupiah(availableBalance)}). Sebagian saldo Anda (${formatRupiah(pendingTotal)}) masih dalam antrean permohonan pending.`,
        400,
        'INSUFFICIENT_BALANCE'
      );
    }

    const requestId = uuidv4();
    const requestNo = await this.generateRequestNo();
    const nowLocal = formatToLocalSqlDateTime();

    await db.execute({
      sql: `INSERT INTO withdrawal_requests (
        id, request_no, nasabah_id, amount, method, bank_name,
        account_number, account_holder, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      args: [
        requestId,
        requestNo,
        nasabahId,
        data.amount,
        data.method,
        data.method === 'TRANSFER' ? data.bank_name?.trim() || null : null,
        data.method === 'TRANSFER' ? data.account_number?.trim() || null : null,
        data.method === 'TRANSFER' ? data.account_holder?.trim() || null : null,
        data.notes?.trim() || null,
        nowLocal,
        nowLocal,
      ],
    });

    return await this.getRequestById(requestId);
  }

  public static async cancelRequest(requestId: string, nasabahId: string) {
    const item = await db.fetchOne<any>(
      'SELECT * FROM withdrawal_requests WHERE id = ?',
      [requestId]
    );

    if (!item) {
      throw new AppError('Permohonan penarikan saldo tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (item.nasabah_id !== nasabahId) {
      throw new AppError('Anda tidak memiliki akses untuk membatalkan permohonan ini.', 403, 'FORBIDDEN');
    }

    if (item.status !== 'PENDING') {
      throw new AppError(
        `Permohonan penarikan tidak dapat dibatalkan karena status saat ini adalah ${item.status}.`,
        400,
        'CANNOT_CANCEL'
      );
    }

    const nowLocal = formatToLocalSqlDateTime();

    await db.execute({
      sql: `UPDATE withdrawal_requests
            SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
            WHERE id = ?`,
      args: [nowLocal, nowLocal, requestId],
    });

    return await this.getRequestById(requestId);
  }

  public static async approveRequest(
    requestId: string,
    adminUserId: string,
    data?: WithdrawalApproveInput | string | null
  ) {
    return await db.transaction(async (tx) => {
      const item = await tx.fetchOne<any>(
        'SELECT * FROM withdrawal_requests WHERE id = ?',
        [requestId]
      );

      if (!item) {
        throw new AppError('Permohonan penarikan saldo tidak ditemukan.', 404, 'NOT_FOUND');
      }

      if (item.status !== 'PENDING') {
        throw new AppError(
          `Permohonan penarikan ini sudah diproses sebelumnya dengan status ${item.status}.`,
          400,
          'ALREADY_PROCESSED'
        );
      }

      // Validasi saldo nasabah saat persetujuan
      const currentBalance = await nasabahService.getNasabahBalance(item.nasabah_id, tx);
      if (currentBalance < item.amount) {
        throw new AppError(
          `Saldo nasabah saat ini (${formatRupiah(currentBalance)}) tidak mencukupi untuk disetujui penarikan sebesar ${formatRupiah(item.amount)}.`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }

      const notes = typeof data === 'string' ? data : data?.notes;
      const txDate = data && typeof data === 'object' && data.transaction_date
        ? formatToLocalSqlDateTime(data.transaction_date)
        : formatToLocalSqlDateTime();

      const txId = uuidv4();
      const txNo = await TransactionService.generateTransactionNo(tx, txDate);
      const balanceAfter = currentBalance - item.amount;

      let txNotes = `[Penarikan #${item.request_no}] ${item.method === 'TRANSFER' ? `Transfer ${item.bank_name || ''} rek. ${item.account_number || ''} a.n ${item.account_holder || ''}` : 'Penarikan Tunai'}`;
      if (notes && notes.trim()) {
        txNotes += ` | Catatan Admin: ${notes.trim()}`;
      } else if (item.notes && item.notes.trim()) {
        txNotes += ` | Catatan: ${item.notes.trim()}`;
      }

      // Catat transaksi TARIK
      await tx.execute({
        sql: `INSERT INTO transactions (
          id, transaction_no, nasabah_id, transaction_date, type, category_id, price_id,
          weight_gram, price_per_kg, amount, debit, credit, balance_after,
          notes, idempotency_key, created_by, created_at
        ) VALUES (?, ?, ?, ?, 'TARIK', NULL, NULL, NULL, NULL, ?, ?, 0, ?, ?, NULL, ?, ?)`,
        args: [
          txId,
          txNo,
          item.nasabah_id,
          txDate,
          item.amount,
          item.amount,
          balanceAfter,
          txNotes,
          adminUserId,
          txDate,
        ],
      });

      // Update status permohonan menjadi APPROVED
      const updatedNow = formatToLocalSqlDateTime();
      await tx.execute({
        sql: `UPDATE withdrawal_requests
              SET status = 'APPROVED',
                  transaction_id = ?,
                  approved_by = ?,
                  approved_at = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [txId, adminUserId, txDate, updatedNow, requestId],
      });

      return await this.getRequestById(requestId, tx);
    });
  }

  public static async rejectRequest(
    requestId: string,
    adminUserId: string,
    data: WithdrawalRejectInput
  ) {
    const item = await db.fetchOne<any>(
      'SELECT * FROM withdrawal_requests WHERE id = ?',
      [requestId]
    );

    if (!item) {
      throw new AppError('Permohonan penarikan saldo tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (item.status !== 'PENDING') {
      throw new AppError(
        `Permohonan penarikan ini sudah diproses sebelumnya dengan status ${item.status}.`,
        400,
        'ALREADY_PROCESSED'
      );
    }

    const nowLocal = formatToLocalSqlDateTime();

    await db.execute({
      sql: `UPDATE withdrawal_requests
            SET status = 'REJECTED',
                rejection_reason = ?,
                rejected_by = ?,
                rejected_at = ?,
                updated_at = ?
            WHERE id = ?`,
      args: [data.rejection_reason.trim(), adminUserId, nowLocal, nowLocal, requestId],
    });

    return await this.getRequestById(requestId);
  }

  public static async listRequests(params: WithdrawalListParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.page_size && params.page_size > 0 ? params.page_size : 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const args: any[] = [];

    if (params.nasabah_id) {
      conditions.push('wr.nasabah_id = ?');
      args.push(params.nasabah_id);
    }

    if (params.status && params.status !== 'ALL') {
      conditions.push('wr.status = ?');
      args.push(params.status);
    }

    if (params.start_date) {
      conditions.push('date(wr.created_at) >= date(?)');
      args.push(params.start_date);
    }

    if (params.end_date) {
      conditions.push('date(wr.created_at) <= date(?)');
      args.push(params.end_date);
    }

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(`(
        wr.request_no LIKE ? OR
        n.name LIKE ? OR
        n.customer_id LIKE ? OR
        n.account_no LIKE ? OR
        wr.bank_name LIKE ? OR
        wr.account_number LIKE ? OR
        wr.account_holder LIKE ?
      )`);
      args.push(q, q, q, q, q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    // Hitung total data
    const countRow = await db.fetchOne<any>(
      `SELECT COUNT(*) as total
       FROM withdrawal_requests wr
       JOIN nasabah n ON wr.nasabah_id = n.id
       WHERE ${whereClause}`,
      args
    );
    const total = countRow ? Number(countRow.total) : 0;

    // Ambil data halaman
    const rows = await db.fetchAll<any>(
      `SELECT wr.*,
              n.customer_id as nasabah_customer_id,
              n.account_no as nasabah_account_no,
              n.name as nasabah_name,
              n.phone as nasabah_phone,
              u_app.name as approver_name,
              u_rej.name as rejector_name,
              t.transaction_no as transaction_no
       FROM withdrawal_requests wr
       JOIN nasabah n ON wr.nasabah_id = n.id
       LEFT JOIN users u_app ON wr.approved_by = u_app.id
       LEFT JOIN users u_rej ON wr.rejected_by = u_rej.id
       LEFT JOIN transactions t ON wr.transaction_id = t.id
       WHERE ${whereClause}
       ORDER BY wr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    const items = rows.map((it) => ({
      ...it,
      amount_formatted: formatRupiah(it.amount),
    }));

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  public static async getSummaryStats(nasabahId?: string) {
    const baseWhere = nasabahId ? 'WHERE nasabah_id = ?' : '';
    const args = nasabahId ? [nasabahId] : [];

    const rows = await db.fetchAll<any>(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM withdrawal_requests
       ${baseWhere}
       GROUP BY status`,
      args
    );

    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;

    for (const r of rows) {
      const c = Number(r.count || 0);
      const a = Number(r.total_amount || 0);
      if (r.status === 'PENDING') {
        pendingCount = c;
        pendingAmount = a;
      } else if (r.status === 'APPROVED') {
        approvedCount = c;
        approvedAmount = a;
      } else if (r.status === 'REJECTED') {
        rejectedCount = c;
      } else if (r.status === 'CANCELLED') {
        cancelledCount = c;
      }
    }

    return {
      pending_count: pendingCount,
      pending_amount: pendingAmount,
      pending_amount_formatted: formatRupiah(pendingAmount),
      approved_count: approvedCount,
      approved_amount: approvedAmount,
      approved_amount_formatted: formatRupiah(approvedAmount),
      rejected_count: rejectedCount,
      cancelled_count: cancelledCount,
      total_count: pendingCount + approvedCount + rejectedCount + cancelledCount,
    };
  }
}
