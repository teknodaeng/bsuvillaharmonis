import { Context } from 'hono';

export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, errorCode?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function successResponse(
  c: Context,
  data?: any,
  message: string = 'OK',
  statusCode: number = 200
) {
  const body: Record<string, any> = {
    success: true,
    message,
  };
  if (data !== undefined) {
    body.data = data;
  }
  return c.json(body, statusCode as any);
}

export function errorResponse(
  c: Context,
  message: string = 'Terjadi kesalahan',
  errorCode?: string,
  statusCode: number = 400,
  details?: any
) {
  const body: Record<string, any> = {
    success: false,
    message,
  };
  if (errorCode) {
    body.error_code = errorCode;
  }
  if (details !== undefined && details !== null) {
    body.details = details;
  }
  return c.json(body, statusCode as any);
}
