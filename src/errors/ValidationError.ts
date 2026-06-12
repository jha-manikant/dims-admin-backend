import type { ZodError } from 'zod';
import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details?: Record<string, unknown>) {
    super({ statusCode: 400, code: 'VALIDATION_ERROR', message, details: details ?? {} });
  }

  static fromZod(error: ZodError): ValidationError {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return new ValidationError('Request validation failed', { issues });
  }
}
