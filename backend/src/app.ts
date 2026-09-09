import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { config } from './core/config.js';
import { AppEnv } from './types/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { successResponse } from './utils/response.js';

import { authRouter } from './routes/auth.js';
import { nasabahRouter } from './routes/nasabah.js';
import { meRouter } from './routes/me.js';
import { usersRouter } from './routes/users.js';
import {
  adminCategoriesRouter,
  categoriesRouter,
} from './routes/categories.js';
import {
  adminPricesRouter,
  pricesRouter,
} from './routes/prices.js';
import { transactionsRouter } from './routes/transactions.js';
import { reportsRouter } from './routes/reports.js';
import { dashboardRouter } from './routes/dashboard.js';

export const app = new Hono<AppEnv>();

// Global Middlewares
app.use('*', logger());
app.use(
  '*',
  secureHeaders({
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    xXssProtection: '1; mode=block',
  })
);

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (
        !origin ||
        config.CORS_ORIGINS.includes('*') ||
        config.CORS_ORIGINS.includes(origin)
      ) {
        return origin || '*';
      }
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposeHeaders: ['Content-Length', 'Content-Disposition'],
  })
);

// Global Error Handler
app.onError(errorHandler);

// System Endpoints
app.get('/', (c) => {
  return successResponse(
    c,
    {
      app_name: config.APP_NAME,
      version: '2.0.0',
      framework: 'Hono Web Application Framework',
      status: 'online',
    },
    `Selamat datang di ${config.APP_NAME} API`
  );
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// API Routes mounting under /api/v1
const v1 = new Hono<AppEnv>();

v1.route('/auth', authRouter);
v1.route('/admin/nasabah', nasabahRouter);
v1.route('/me', meRouter);
v1.route('/admin/users', usersRouter);
v1.route('/master/categories', categoriesRouter);
v1.route('/admin/master/categories', adminCategoriesRouter);
v1.route('/master/waste-prices', pricesRouter);
v1.route('/admin/master/waste-prices', adminPricesRouter);
v1.route('/admin/transactions', transactionsRouter);
v1.route('/admin/reports', reportsRouter);
v1.route('/admin', dashboardRouter);

app.route('/api/v1', v1);
