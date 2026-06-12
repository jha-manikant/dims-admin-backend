import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: Record<string, unknown>) {
    super({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      details: details ?? {},
    });
  }
}
