import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../configs/env.js';
import { AppError, ValidationError } from '../errors/index.js';

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  requestId: string;
  details?: Record<string, unknown>;
}

/**
 * Global error handler (best-practices rules #8, #10).
 *
 * - AppError subclasses → respond with the declared status/code/message.
 * - ZodError → ValidationError (400) with parsed issues.
 * - Anything else → opaque 500 in production; full stack in dev.
 *
 * `next` is required for Express to recognize this as an error-handling
 * middleware (4-argument signature).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const log = req.log;
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    const ve = ValidationError.fromZod(err);
    log.warn({ err: ve, requestId }, 'validation_failed');
    sendError(res, ve, requestId);
    return;
  }

  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    log[level]({ err, requestId, statusCode: err.statusCode, code: err.code }, 'app_error');
    sendError(res, err, requestId);
    return;
  }

  // Unknown / programmer error — never leak details in production.
  log.error({ err, requestId }, 'unhandled_error');
  const rawMessage = err instanceof Error ? err.message : 'Unknown error';
  const body: ErrorBody = {
    success: false,
    message: isProduction ? 'Internal server error' : rawMessage,
    code: 'INTERNAL_ERROR',
    requestId,
  };
  if (!isProduction && err instanceof Error && err.stack !== undefined) {
    body.details = { stack: err.stack };
  }
  res.status(500).json(body);
}

function sendError(res: Response, err: AppError, requestId: string): void {
  const body: ErrorBody = {
    success: false,
    message: err.message,
    code: err.code,
    requestId,
  };
  if (err.details) {
    body.details = err.details;
  }
  res.status(err.statusCode).json(body);
}
