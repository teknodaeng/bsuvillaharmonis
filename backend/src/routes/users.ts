import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { userService } from '../services/userService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import { validateJson } from '../utils/validator.js';
import {
  userCreateSchema,
  userResetPasswordSchema,
  userStatusUpdateSchema,
  userUpdateSchema,
} from '../schemas/user.schema.js';

export const usersRouter = new Hono<AppEnv>();

// All routes require ADMIN
usersRouter.use('*', authMiddleware, requireAdmin);

// GET /api/v1/admin/users
usersRouter.get('/', async (c) => {
  const query = c.req.query();
  const result = await userService.listUsers({
    role: query.role,
    status: query.status,
    search: query.search,
    page: query.page ? parseInt(query.page, 10) : 1,
    page_size: query.page_size ? parseInt(query.page_size, 10) : 20,
  });
  return successResponse(c, result, 'Daftar pengguna berhasil dimuat.');
});

// POST /api/v1/admin/users
usersRouter.post('/', validateJson(userCreateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const result = await userService.createUser(data, user.id);
  return successResponse(c, result, 'Pengguna baru berhasil ditambahkan.', 201);
});

// GET /api/v1/admin/users/:id
usersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await userService.getUserById(id);
  return successResponse(c, result, 'Detail pengguna berhasil dimuat.');
});

// PUT /api/v1/admin/users/:id
usersRouter.put('/:id', validateJson(userUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await userService.updateUser(id, data, user.id);
  return successResponse(c, result, 'Data pengguna berhasil diperbarui.');
});

// PATCH /api/v1/admin/users/:id/status
usersRouter.patch('/:id/status', validateJson(userStatusUpdateSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  const result = await userService.updateUserStatus(id, data.status, user.id);
  return successResponse(c, result, 'Status pengguna berhasil diperbarui.');
});

// POST /api/v1/admin/users/:id/reset-password
usersRouter.post('/:id/reset-password', validateJson(userResetPasswordSchema), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const data = c.req.valid('json' as any);
  await userService.resetUserPassword(id, data.new_password, user.id);
  return successResponse(c, null, 'Password pengguna berhasil direset.');
});
