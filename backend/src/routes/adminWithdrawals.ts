import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { WithdrawalService } from '../services/withdrawalService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import {
  withdrawalApproveSchema,
  withdrawalRejectSchema,
} from '../schemas/withdrawal.schema.js';

export const adminWithdrawalsRouter = new Hono<AppEnv>();

// All routes require ADMIN role
adminWithdrawalsRouter.use('*', authMiddleware, requireAdmin);

// GET /api/v1/admin/withdrawal-requests/summary
adminWithdrawalsRouter.get('/summary', async (c) => {
  const summary = await WithdrawalService.getSummaryStats();
  return successResponse(c, summary, 'Ringkasan permohonan penarikan berhasil dimuat.');
});

// GET /api/v1/admin/withdrawal-requests
adminWithdrawalsRouter.get('/', async (c) => {
  const query = c.req.query();
  const result = await WithdrawalService.listRequests({
    nasabah_id: query.nasabah_id,
    status: query.status,
    start_date: query.start_date,
    end_date: query.end_date,
    search: query.search,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 20,
  });
  return successResponse(c, result, 'Daftar permohonan penarikan berhasil dimuat.');
});

// GET /api/v1/admin/withdrawal-requests/:id
adminWithdrawalsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await WithdrawalService.getRequestById(id);
  return successResponse(c, result, 'Detail permohonan penarikan berhasil dimuat.');
});

// POST /api/v1/admin/withdrawal-requests/:id/approve
adminWithdrawalsRouter.post('/:id/approve', validateJson(withdrawalApproveSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = c.req.valid('json' as any);
  const result = await WithdrawalService.approveRequest(id, user.id, body.notes || undefined);
  return successResponse(
    c,
    result,
    `Permohonan penarikan ${result.request_no} berhasil disetujui dan saldo telah dicairkan.`
  );
});

// POST /api/v1/admin/withdrawal-requests/:id/reject
adminWithdrawalsRouter.post('/:id/reject', validateJson(withdrawalRejectSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = c.req.valid('json' as any);
  const result = await WithdrawalService.rejectRequest(id, user.id, body);
  return successResponse(
    c,
    result,
    `Permohonan penarikan ${result.request_no} telah ditolak.`
  );
});
