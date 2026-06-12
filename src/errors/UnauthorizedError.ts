import { AppError } from './AppError.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super({ statusCode: 401, code: 'UNAUTHORIZED', message, details: details ?? {} });
  }
}
