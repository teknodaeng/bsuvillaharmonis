import { db } from '../core/database.js';
import { formatRupiah } from '../utils/currency.js';
import { nasabahService } from './nasabahService.js';
import { transactionService } from './transactionService.js';

export class DashboardService {
  public static async getAdminDashboard() {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Nasabah counts
    const totalNasabahRow = await db.fetchOne<any>('SELECT COUNT(*) as cnt FROM nasabah');
    const totalNasabah = totalNasabahRow ? Number(totalNasabahRow.cnt) : 0;

    const activeNasabahRow = await db.fetchOne<any>(
      "SELECT COUNT(*) as cnt FROM nasabah WHERE status = 'ACTIVE'"
    );
    const totalNasabahActive = activeNasabahRow ? Number(activeNasabahRow.cnt) : 0;

    // 2. Financial totals
    const netBalanceRow = await db.fetchOne<any>(
      'SELECT COALESCE(SUM(credit) - SUM(debit), 0) as net FROM transactions'
    );
    const totalBalanceAll = netBalanceRow ? Number(netBalanceRow.net) : 0;

    const setorMonthRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(credit), 0) as s FROM transactions WHERE type = 'SETOR' AND transaction_date LIKE ?",
      [`${currentMonthPrefix}%`]
    );
    const totalSetorThisMonth = setorMonthRow ? Number(setorMonthRow.s) : 0;

    const tarikMonthRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(debit), 0) as t FROM transactions WHERE type = 'TARIK' AND transaction_date LIKE ?",
      [`${currentMonthPrefix}%`]
    );
    const totalTarikThisMonth = tarikMonthRow ? Number(tarikMonthRow.t) : 0;

    // 3. Transactions today
    const trxTodayRow = await db.fetchOne<any>(
      "SELECT COUNT(*) as cnt FROM transactions WHERE date(transaction_date) = date('now')"
    );
    const totalTransactionsToday = trxTodayRow ? Number(trxTodayRow.cnt) : 0;

    // 4. Recent transactions (latest 5)
    const { items: recentTxs } = await transactionService.listTransactions({
      page: 1,
      page_size: 5,
    });

    return {
      total_nasabah: totalNasabah,
      total_nasabah_active: totalNasabahActive,
      total_balance_all: totalBalanceAll,
      total_balance_all_formatted: formatRupiah(totalBalanceAll),
      total_setor_this_month: totalSetorThisMonth,
      total_setor_this_month_formatted: formatRupiah(totalSetorThisMonth),
      total_tarik_this_month: totalTarikThisMonth,
      total_tarik_this_month_formatted: formatRupiah(totalTarikThisMonth),
      total_transactions_today: totalTransactionsToday,
      recent_transactions: recentTxs,
    };
  }

  public static async getNasabahDashboard(nasabahId: string) {
    const nasabah = await nasabahService.getNasabahById(nasabahId);
    const balance = await nasabahService.getNasabahBalance(nasabahId);

    const setorRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(credit), 0) as s FROM transactions WHERE nasabah_id = ? AND type = 'SETOR'",
      [nasabahId]
    );
    const totalSetor = setorRow ? Number(setorRow.s) : 0;

    const tarikRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(debit), 0) as t FROM transactions WHERE nasabah_id = ? AND type = 'TARIK'",
      [nasabahId]
    );
    const totalTarik = tarikRow ? Number(tarikRow.t) : 0;

    const { items: recentTxs } = await transactionService.listTransactions({
      nasabah_id: nasabahId,
      page: 1,
      page_size: 5,
    });

    return {
      nasabah_id: nasabahId,
      customer_id: nasabah.customer_id,
      account_no: nasabah.account_no,
      name: nasabah.name,
      balance,
      balance_formatted: formatRupiah(balance),
      total_setor: totalSetor,
      total_setor_formatted: formatRupiah(totalSetor),
      total_tarik: totalTarik,
      total_tarik_formatted: formatRupiah(totalTarik),
      recent_transactions: recentTxs,
    };
  }
}

export const dashboardService = DashboardService;
