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

    // 5. Total deposited waste weight & breakdown per category
    const overallWeightRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(weight_gram), 0) as total_weight_gram FROM transactions WHERE type = 'SETOR'"
    );
    const totalWeightGram = overallWeightRow ? Number(overallWeightRow.total_weight_gram) : 0;
    const totalWeightKg = Math.round((totalWeightGram / 1000) * 100) / 100;

    const categoryWeightRows = await db.fetchAll<any>(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(SUM(t.weight_gram), 0) as total_weight_gram,
        COALESCE(COUNT(t.id), 0) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM waste_categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'SETOR'
      WHERE c.is_active = 1 OR t.id IS NOT NULL
      GROUP BY c.id, c.name
      ORDER BY total_weight_gram DESC, c.name ASC`
    );

    const categoriesWeight = categoryWeightRows.map((cat: any) => {
      const catWeightGram = Number(cat.total_weight_gram || 0);
      const catWeightKg = Math.round((catWeightGram / 1000) * 100) / 100;
      const percentage = totalWeightGram > 0 
        ? Math.round((catWeightGram / totalWeightGram) * 1000) / 10 
        : 0;

      return {
        category_id: cat.category_id,
        category_name: cat.category_name,
        total_weight_gram: catWeightGram,
        total_weight_kg: catWeightKg,
        total_weight_kg_formatted: `${catWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
        transaction_count: Number(cat.transaction_count || 0),
        total_amount: Number(cat.total_amount || 0),
        total_amount_formatted: formatRupiah(Number(cat.total_amount || 0)),
        percentage,
      };
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
      total_weight_gram: totalWeightGram,
      total_weight_kg: totalWeightKg,
      total_weight_kg_formatted: `${totalWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
      categories_weight: categoriesWeight,
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

    // Total deposited waste weight for this nasabah
    const nasabahWeightRow = await db.fetchOne<any>(
      "SELECT COALESCE(SUM(weight_gram), 0) as total_weight_gram FROM transactions WHERE nasabah_id = ? AND type = 'SETOR'",
      [nasabahId]
    );
    const nasabahTotalWeightGram = nasabahWeightRow ? Number(nasabahWeightRow.total_weight_gram) : 0;
    const nasabahTotalWeightKg = Math.round((nasabahTotalWeightGram / 1000) * 100) / 100;

    // Breakdown per category deposited by this nasabah
    const nasabahCategoryRows = await db.fetchAll<any>(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(SUM(t.weight_gram), 0) as total_weight_gram,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM transactions t
      JOIN waste_categories c ON t.category_id = c.id
      WHERE t.nasabah_id = ? AND t.type = 'SETOR'
      GROUP BY c.id, c.name
      ORDER BY total_weight_gram DESC, c.name ASC`,
      [nasabahId]
    );

    const nasabahCategoriesWeight = nasabahCategoryRows.map((cat: any) => {
      const catWeightGram = Number(cat.total_weight_gram || 0);
      const catWeightKg = Math.round((catWeightGram / 1000) * 100) / 100;
      const percentage = nasabahTotalWeightGram > 0 
        ? Math.round((catWeightGram / nasabahTotalWeightGram) * 1000) / 10 
        : 0;

      return {
        category_id: cat.category_id,
        category_name: cat.category_name,
        total_weight_gram: catWeightGram,
        total_weight_kg: catWeightKg,
        total_weight_kg_formatted: `${catWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
        transaction_count: Number(cat.transaction_count || 0),
        total_amount: Number(cat.total_amount || 0),
        total_amount_formatted: formatRupiah(Number(cat.total_amount || 0)),
        percentage,
      };
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
      total_weight_gram: nasabahTotalWeightGram,
      total_weight_kg: nasabahTotalWeightKg,
      total_weight_kg_formatted: `${nasabahTotalWeightKg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
      categories_weight: nasabahCategoriesWeight,
      recent_transactions: recentTxs,
    };
  }
}

export const dashboardService = DashboardService;
