import { AppError } from './AppError.js';

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super({ statusCode: 409, code: 'CONFLICT', message, details: details ?? {} });
  }
}
