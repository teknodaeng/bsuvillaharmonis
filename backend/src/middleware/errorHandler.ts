import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AppError, errorResponse } from '../utils/response.js';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return errorResponse(c, err.message, err.errorCode, err.statusCode, err.details);
  }

  if (err instanceof HTTPException) {
    return errorResponse(c, err.message, `HTTP_${err.status}`, err.status);
  }

  if (err instanceof ZodError) {
    const issues = err.issues;
    const firstMsg = issues.length > 0 ? issues[0].message : 'Data yang dikirim tidak valid.';
    return errorResponse(c, firstMsg, 'VALIDATION_ERROR', 422, issues);
  }

  console.error('[UNHANDLED ERROR]', err);
  return errorResponse(c, 'Terjadi kesalahan internal pada server.', 'INTERNAL_SERVER_ERROR', 500);
}
