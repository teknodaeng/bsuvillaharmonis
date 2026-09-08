import { Hono } from 'hono';
import { AppEnv } from '../types/index.js';
import { reportService } from '../services/reportService.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

export const reportsRouter = new Hono<AppEnv>();

const reportsLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Terlalu banyak permintaan pembuatan dokumen laporan. Silakan tunggu beberapa saat.',
});

// All routes require ADMIN and Rate Limiting
reportsRouter.use('*', authMiddleware, requireAdmin, reportsLimiter);

// 1. Transactions Report
reportsRouter.get('/transactions.xlsx', async (c) => {
  const query = c.req.query();
  const buffer = await reportService.generateTransactionsExcel({
    start_date: query.start_date,
    end_date: query.end_date,
    type: query.type,
    category_id: query.category_id,
    nasabah_id: query.nasabah_id,
  });

  c.header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  c.header('Content-Disposition', 'attachment; filename="laporan-transaksi.xlsx"');
  return c.body(new Uint8Array(buffer));
});

reportsRouter.get('/transactions.pdf', async (c) => {
  const query = c.req.query();
  const buffer = await reportService.generateTransactionsPdf({
    start_date: query.start_date,
    end_date: query.end_date,
    type: query.type,
    category_id: query.category_id,
    nasabah_id: query.nasabah_id,
  });

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="laporan-transaksi.pdf"');
  return c.body(new Uint8Array(buffer));
});

// 2. Category Recap Report
reportsRouter.get('/category-recap.xlsx', async (c) => {
  const query = c.req.query();
  const buffer = await reportService.generateCategoryRecapExcel({
    start_date: query.start_date,
    end_date: query.end_date,
  });

  c.header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  c.header('Content-Disposition', 'attachment; filename="rekapitulasi-sampah.xlsx"');
  return c.body(new Uint8Array(buffer));
});

reportsRouter.get('/category-recap.pdf', async (c) => {
  const query = c.req.query();
  const buffer = await reportService.generateCategoryRecapPdf({
    start_date: query.start_date,
    end_date: query.end_date,
  });

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="rekapitulasi-sampah.pdf"');
  return c.body(new Uint8Array(buffer));
});

// 3. Nasabah & Saldo Report
reportsRouter.get('/nasabah.xlsx', async (c) => {
  const buffer = await reportService.generateNasabahExcel();
  c.header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  c.header('Content-Disposition', 'attachment; filename="daftar-nasabah-saldo.xlsx"');
  return c.body(new Uint8Array(buffer));
});

reportsRouter.get('/nasabah.pdf', async (c) => {
  const buffer = await reportService.generateNasabahPdf();
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="daftar-nasabah-saldo.pdf"');
  return c.body(new Uint8Array(buffer));
});

// 4. Prices Report
reportsRouter.get('/prices.xlsx', async (c) => {
  const buffer = await reportService.generatePricesExcel();
  c.header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  c.header('Content-Disposition', 'attachment; filename="master-harga-sampah.xlsx"');
  return c.body(new Uint8Array(buffer));
});

reportsRouter.get('/prices.pdf', async (c) => {
  const buffer = await reportService.generatePricesPdf();
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', 'inline; filename="master-harga-sampah.pdf"');
  return c.body(new Uint8Array(buffer));
});
