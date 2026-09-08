import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { config } from './config.js';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

export async function createAccessToken(payload: Record<string, any>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + config.ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return await sign(
    {
      ...payload,
      exp,
      token_type: 'access',
    },
    config.APP_SECRET_KEY,
    config.JWT_ALGORITHM as any
  );
}

export async function createRefreshToken(payload: Record<string, any>): Promise<string> {
  const exp =
    Math.floor(Date.now() / 1000) + config.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return await sign(
    {
      ...payload,
      exp,
      token_type: 'refresh',
    },
    config.APP_SECRET_KEY,
    config.JWT_ALGORITHM as any
  );
}

export async function decodeToken(token: string): Promise<any> {
  try {
    return await verify(token, config.APP_SECRET_KEY, config.JWT_ALGORITHM as any);
  } catch (err) {
    return null;
  }
}
