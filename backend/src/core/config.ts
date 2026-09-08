import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from cwd and from backend package root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseCorsOrigins(raw?: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === '*') {
    return ['*'];
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim());
      }
    } catch {
      // fallback
    }
  }
  return trimmed
    .replace(/[\[\]"]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const rawSecretKey = process.env.APP_SECRET_KEY;
const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
const DEFAULT_INSECURE_SECRET = 'supersecretkeyforbsuvillaharmonis2026changethisinprod';

if (!rawSecretKey || rawSecretKey === DEFAULT_INSECURE_SECRET) {
  if (isProd) {
    console.error(
      '[FATAL SECURITY ERROR] APP_SECRET_KEY wajib diatur di lingkungan produksi dan tidak boleh kosong atau menggunakan kunci default!'
    );
    process.exit(1);
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[SECURITY WARNING] APP_SECRET_KEY menggunakan kunci default atau belum diatur. Sangat disarankan mengatur kunci acak minimal 32 karakter di .env!'
    );
  }
}

export const config = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  APP_NAME: process.env.APP_NAME || 'BSU Villa Harmonis',
  APP_ENV: process.env.APP_ENV || 'development',
  APP_SECRET_KEY: rawSecretKey || DEFAULT_INSECURE_SECRET,
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'file:bsuvh.db',
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',
  LOCAL_DB_PATH: process.env.LOCAL_DB_PATH || 'bsuvh.db',

  // Auth / JWT
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10),
  REFRESH_TOKEN_EXPIRE_DAYS: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7', 10),

  // CORS
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),

  BANK_NAME: process.env.BANK_NAME || 'BSU Villa Harmonis',
  RECEIPT_FOOTER:
    process.env.RECEIPT_FOOTER ||
    'Terima kasih telah menjaga lingkungan bersama Bank Sampah Villa Harmonis.',
};
