import { AppError } from './AppError.js';

/**
 * Failures from external services (DIMS .NET API, Google, etc.). Maps the
 * upstream response to an internal error shape so we never leak vendor-specific
 * payloads to clients (best-practices rule #45).
 */
export class UpstreamError extends AppError {
  constructor(opts: {
    message?: string;
    code?: string;
    statusCode?: number;
    upstream?: string;
    details?: Record<string, unknown>;
  }) {
    super({
      statusCode: opts.statusCode ?? 502,
      code: opts.code ?? 'UPSTREAM_ERROR',
      message: opts.message ?? 'Upstream service error',
      details: { upstream: opts.upstream ?? 'unknown', ...(opts.details ?? {}) },
    });
  }

  static dimsUnavailable(details?: Record<string, unknown>): UpstreamError {
    return new UpstreamError({
      message: 'DIMS service is unavailable',
      code: 'DIMS_UNAVAILABLE',
      statusCode: 502,
      upstream: 'dims',
      ...(details ? { details } : {}),
    });
  }

  static dimsTimeout(details?: Record<string, unknown>): UpstreamError {
    return new UpstreamError({
      message: 'DIMS request timed out',
      code: 'DIMS_TIMEOUT',
      statusCode: 504,
      upstream: 'dims',
      ...(details ? { details } : {}),
    });
  }
}
