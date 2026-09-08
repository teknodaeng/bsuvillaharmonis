import { Context, Next } from 'hono';
import { AppError } from '../utils/response.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
}

export function rateLimiter(options: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    if (options.skip && options.skip(c)) {
      return await next();
    }

    // Default key is client IP + request path
    const forwarded = c.req.header('x-forwarded-for');
    const ip =
      c.req.header('cf-connecting-ip') ||
      (forwarded ? forwarded.split(',')[0].trim() : '') ||
      c.req.header('x-real-ip') ||
      'unknown-client';

    const path = c.req.path;
    const clientKey = options.keyGenerator ? options.keyGenerator(c) : `${ip}:${path}`;
    const now = Date.now();

    let record = rateLimitStore.get(clientKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      rateLimitStore.set(clientKey, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', String(options.max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.floor(record.resetTime / 1000)));

    if (record.count > options.max) {
      c.header('Retry-After', String(resetSeconds));
      throw new AppError(
        options.message || 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.',
        429,
        'TOO_MANY_REQUESTS',
        { retry_after_seconds: resetSeconds }
      );
    }

    await next();
  };
}

// Utility for tests to reset in-memory rate limit store
export function resetRateLimitStore() {
  rateLimitStore.clear();
}
