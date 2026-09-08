import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { priceService } from '../services/priceService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import {
  priceCreateSchema,
  priceStatusSchema,
  priceUpdateSchema,
} from '../schemas/price.schema.js';

// Public / Authenticated price router mounted at /api/v1/master/waste-prices
export const pricesRouter = new Hono<AppEnv>();

pricesRouter.get('/', async (c) => {
  const query = c.req.query();
  const result = await priceService.listPrices({
    category_id: query.category_id,
    status: query.status,
    search: query.search,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 20,
  });
  return successResponse(c, result, 'Master harga berhasil dimuat.');
});

pricesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await priceService.getPriceById(id);
  return successResponse(c, result, 'Detail harga berhasil dimuat.');
});

// Admin price router mounted at /api/v1/admin/master/waste-prices
export const adminPricesRouter = new Hono<AppEnv>();
adminPricesRouter.use('*', authMiddleware, requireAdmin);

adminPricesRouter.post('/', validateJson(priceCreateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const result = await priceService.createPrice(data, user.id);
  return successResponse(c, result, 'Master harga berhasil ditetapkan.', 201);
});

adminPricesRouter.put('/:id', validateJson(priceUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await priceService.updatePrice(id, data, user.id);
  return successResponse(c, result, 'Master harga berhasil diperbarui.');
});

adminPricesRouter.patch('/:id/status', validateJson(priceStatusSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await priceService.updatePriceStatus(id, data.status, user.id);
  return successResponse(c, result, 'Status harga berhasil diubah.');
});

adminPricesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await priceService.deletePrice(id);
  return successResponse(c, null, 'Master harga berhasil dihapus.');
});
