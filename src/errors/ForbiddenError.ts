import { AppError } from './AppError.js';

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super({ statusCode: 403, code: 'FORBIDDEN', message, details: details ?? {} });
  }

  static missingPermission(permissionKey: string): ForbiddenError {
    return new ForbiddenError('You do not have permission to perform this action', {
      required: permissionKey,
      code: 'PERMISSION_DENIED',
    });
  }
}
