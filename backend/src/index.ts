import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './core/config.js';
import { runMigrations } from './db/migrations.js';
import { seedDatabase } from './db/seed.js';

export { app };

// Server startup for Node.js runtime
export async function startServer() {
  try {
    console.log(`[INIT] Memulai backend ${config.APP_NAME} (Hono Framework)...`);
    await runMigrations();
    await seedDatabase();

    if (process.env.NODE_ENV !== 'test') {
      serve(
        {
          fetch: app.fetch,
          port: config.PORT,
        },
        (info) => {
          console.log(`[HONO] Server berjalan di http://localhost:${info.port}`);
        }
      );
    }
  } catch (err) {
    console.error('[FATAL] Gagal memulai server:', err);
    if (typeof process !== 'undefined' && typeof process.exit === 'function') {
      process.exit(1);
    }
  }
}

// Start if executed directly in Node.js
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
