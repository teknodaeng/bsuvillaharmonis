import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { dashboardService } from '../services/dashboardService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';

export const dashboardRouter = new Hono<AppEnv>();

// GET /api/v1/admin/dashboard
dashboardRouter.get('/dashboard', authMiddleware, requireAdmin, async (c) => {
  const data = await dashboardService.getAdminDashboard();
  return successResponse(c, data, 'Statistik dashboard admin berhasil dimuat.');
});
