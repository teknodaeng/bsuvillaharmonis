import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { nasabahService } from '../services/nasabahService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import {
  nasabahCreateSchema,
  nasabahStatusUpdateSchema,
  nasabahUpdateSchema,
} from '../schemas/nasabah.schema.js';

export const nasabahRouter = new Hono<AppEnv>();

// All routes require ADMIN
nasabahRouter.use('*', authMiddleware, requireAdmin);

// GET /api/v1/admin/nasabah
nasabahRouter.get('/', async (c) => {
  const query = c.req.query();
  const result = await nasabahService.listNasabah({
    search: query.search,
    status: query.status,
    category: query.category,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 10,
  });
  return successResponse(c, result, 'Daftar nasabah berhasil dimuat.');
});

// POST /api/v1/admin/nasabah
nasabahRouter.post('/', validateJson(nasabahCreateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const result = await nasabahService.createNasabah(data, 'ADMIN', user.id);
  return successResponse(c, result, 'Nasabah baru berhasil didaftarkan.', 201);
});

// GET /api/v1/admin/nasabah/:id
nasabahRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await nasabahService.getNasabahById(id);
  return successResponse(c, result, 'Detail nasabah berhasil dimuat.');
});

// PUT /api/v1/admin/nasabah/:id
nasabahRouter.put('/:id', validateJson(nasabahUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await nasabahService.updateNasabah(id, data, user.id);
  return successResponse(c, result, 'Data nasabah berhasil diperbarui.');
});

// PATCH /api/v1/admin/nasabah/:id/status
nasabahRouter.patch('/:id/status', validateJson(nasabahStatusUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await nasabahService.updateNasabahStatus(id, data.status, user.id);
  return successResponse(c, result, 'Status nasabah berhasil diubah.');
});

// GET /api/v1/admin/nasabah/:id/balance
nasabahRouter.get('/:id/balance', async (c) => {
  const id = c.req.param('id');
  const nasabah = await nasabahService.getNasabahById(id);
  const balance = await nasabahService.getNasabahBalance(nasabah.id);
  return successResponse(
    c,
    {
      nasabah_id: nasabah.id,
      customer_id: nasabah.customer_id,
      account_no: nasabah.account_no,
      name: nasabah.name,
      balance,
    },
    'Saldo nasabah berhasil dimuat.'
  );
});

// GET /api/v1/admin/nasabah/:id/transactions
nasabahRouter.get('/:id/transactions', async (c) => {
  const id = c.req.param('id');
  const query = c.req.query();
  const result = await nasabahService.getNasabahTransactions(id, {
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 10,
    type: query.type,
  });
  return successResponse(c, result, 'Riwayat transaksi nasabah berhasil dimuat.');
});
