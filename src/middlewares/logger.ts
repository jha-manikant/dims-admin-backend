import type { IncomingMessage, ServerResponse } from 'http';
import { pinoHttp } from 'pino-http';
import { isProduction } from '../configs/env.js';
import { logger } from '../utils/logger.js';

/**
 * pino-http middleware. Mount AFTER requestId so the per-request id is already
 * on the request object. Every log line emitted inside the request lifecycle
 * carries `requestId` automatically via the child logger.
 */
export const httpLogger = pinoHttp({
  logger,
  // Reuse the id already set by the requestId middleware.
  genReqId: (req): string => (req as unknown as { requestId?: string }).requestId ?? '',
  customLogLevel: (_req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method ?? '?'} ${req.url ?? '?'} ${String(res.statusCode)}`,
  customErrorMessage: (req, res, err) =>
    `${req.method ?? '?'} ${req.url ?? '?'} ${String(res.statusCode)} ${err.message}`,
  // In dev we keep lean req/res serializers; in prod we ride pino-http's defaults.
  // Conditional spread keeps `serializers` absent in prod — `exactOptionalPropertyTypes`
  // rejects `serializers: undefined`.
  ...(isProduction
    ? {}
    : {
        serializers: {
          req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
          res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
        },
      }),
});
