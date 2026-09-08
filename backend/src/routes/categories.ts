import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { categoryService } from '../services/categoryService.js';
import { priceService } from '../services/priceService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import {
  categoryCreateSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
} from '../schemas/category.schema.js';

// Public / Authenticated category router mounted at /api/v1/master/categories
export const categoriesRouter = new Hono<AppEnv>();

categoriesRouter.get('/', async (c) => {
  const query = c.req.query();
  const activeOnly =
    query.active_only === 'true' ||
    query.active_only === '1' ||
    query.is_active === 'true' ||
    query.is_active === '1';
  const result = await categoryService.listCategories({
    active_only: activeOnly,
    search: query.search,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 50,
  });
  return successResponse(c, result, 'Master kategori berhasil dimuat.');
});

categoriesRouter.get('/:id/active-price', async (c) => {
  const id = c.req.param('id');
  const result = await priceService.getActivePriceByCategory(id);
  return successResponse(c, result, 'Tarif aktif berhasil dimuat.');
});

categoriesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await categoryService.getCategoryById(id);
  return successResponse(c, result, 'Detail kategori berhasil dimuat.');
});

// Admin category router mounted at /api/v1/admin/master/categories
export const adminCategoriesRouter = new Hono<AppEnv>();
adminCategoriesRouter.use('*', authMiddleware, requireAdmin);

adminCategoriesRouter.post('/', validateJson(categoryCreateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const result = await categoryService.createCategory(data, user.id);
  return successResponse(c, result, 'Kategori sampah berhasil dibuat.', 201);
});

adminCategoriesRouter.put('/:id', validateJson(categoryUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await categoryService.updateCategory(id, data, user.id);
  return successResponse(c, result, 'Kategori sampah berhasil diperbarui.');
});

adminCategoriesRouter.patch('/:id/status', validateJson(categoryStatusSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await categoryService.updateCategoryStatus(id, data.is_active, user.id);
  return successResponse(c, result, 'Status kategori sampah berhasil diubah.');
});

adminCategoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await categoryService.deleteCategory(id);
  return successResponse(c, null, 'Kategori sampah berhasil dihapus.');
});
