import { zValidator } from '@hono/zod-validator';
import { ZodSchema } from 'zod';
import { errorResponse } from './response.js';

export function validateJson<T extends ZodSchema>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues;
      const firstIssue = issues[0];
      const pathStr = firstIssue?.path?.length ? `${firstIssue.path.join('.')}: ` : '';
      const message = `${pathStr}${firstIssue?.message || 'Data tidak valid.'}`;
      return errorResponse(c, message, 'VALIDATION_ERROR', 422, issues);
    }
  });
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues;
      const message = issues[0]?.message || 'Parameter query tidak valid.';
      return errorResponse(c, message, 'VALIDATION_ERROR', 422, issues);
    }
  });
}
