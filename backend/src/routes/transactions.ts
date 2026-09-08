import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { transactionService } from '../services/transactionService.js';
import { receiptService } from '../services/receiptService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import { transactionCreateSchema } from '../schemas/transaction.schema.js';

export const transactionsRouter = new Hono<AppEnv>();

// All routes require ADMIN
transactionsRouter.use('*', authMiddleware, requireAdmin);

// GET /api/v1/admin/transactions
transactionsRouter.get('/', async (c) => {
  const query = c.req.query();
  const result = await transactionService.listTransactions({
    nasabah_id: query.nasabah_id,
    start_date: query.start_date,
    end_date: query.end_date,
    type: query.type,
    category_id: query.category_id,
    search: query.search,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 20,
  });
  return successResponse(c, result, 'Daftar transaksi berhasil dimuat.');
});

// POST /api/v1/admin/transactions
transactionsRouter.post('/', validateJson(transactionCreateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const result = await transactionService.createTransaction(data, user.id);
  const actionName = data.type === 'SETOR' ? 'Setor sampah' : 'Tarik tunai';
  return successResponse(c, result, `${actionName} berhasil dicatat.`, 201);
});

// GET /api/v1/admin/transactions/:id
transactionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await transactionService.getTransactionById(id);
  return successResponse(c, result, 'Detail transaksi berhasil dimuat.');
});

// GET /api/v1/admin/transactions/:id/receipt
transactionsRouter.get('/:id/receipt', async (c) => {
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
