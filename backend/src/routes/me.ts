import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireNasabah } from '../middleware/roleGuard.js';
import { nasabahService } from '../services/nasabahService.js';
import { dashboardService } from '../services/dashboardService.js';
import { transactionService } from '../services/transactionService.js';
import { receiptService } from '../services/receiptService.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import { nasabahUpdateSchema } from '../schemas/nasabah.schema.js';

export const meRouter = new Hono<AppEnv>();

// All routes require NASABAH
meRouter.use('*', authMiddleware, requireNasabah);

// GET /api/v1/me/nasabah
meRouter.get('/nasabah', async (c) => {
  const user = c.get('user');
  const nasabah = await nasabahService.getNasabahById(user.nasabah_id || user.id);
  return successResponse(c, nasabah);
});

// PUT /api/v1/me/nasabah
meRouter.put('/nasabah', validateJson(nasabahUpdateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const nasabah = await nasabahService.updateNasabah(user.nasabah_id || user.id, data, user.id);
  return successResponse(c, nasabah, 'Profil data diri Anda berhasil diperbarui.');
});

// GET /api/v1/me/balance
meRouter.get('/balance', async (c) => {
  const user = c.get('user');
  const balance = await nasabahService.getNasabahBalance(user.nasabah_id || user.id);
  return successResponse(c, {
    nasabah_id: user.nasabah_id,
    customer_id: user.nasabah?.customer_id || '',
    account_no: user.nasabah?.account_no || '',
    name: user.nasabah?.name || '',
    balance,
  });
});

// GET /api/v1/me/dashboard
meRouter.get('/dashboard', async (c) => {
  const user = c.get('user');
  const data = await dashboardService.getNasabahDashboard(user.nasabah_id || user.id);
  return successResponse(c, data);
});

// GET /api/v1/me/transactions
meRouter.get('/transactions', async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const result = await transactionService.listTransactions({
    nasabah_id: user.nasabah_id || user.id,
    start_date: query.start_date,
    end_date: query.end_date,
    type: query.type,
    category_id: query.category_id,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 20,
  });
  return successResponse(c, result);
});

// GET /api/v1/me/transactions/:id/receipt
meRouter.get('/transactions/:id/receipt', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const format = c.req.query('format');

  if (format === 'pdf') {
    const pdfBuffer = await receiptService.generateReceiptPdf(id, user);
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `inline; filename="bukti-transaksi-${id.slice(0, 8)}.pdf"`);
    return c.body(new Uint8Array(pdfBuffer));
  }

  const receiptData = await receiptService.getReceiptData(id, user);
  return successResponse(c, receiptData);
});
