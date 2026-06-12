import { pino } from 'pino';
import { env, isProduction } from '../configs/env.js';

/**
 * Root Pino logger. Use directly outside the request lifecycle (boot, shutdown,
 * background workers). Inside an Express request, prefer `req.log` so the
 * requestId is attached.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 }, // stdout, pretty-print can be piped externally
        },
      }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
      'req.body.token',
      'req.body.secret',
      'req.body.idToken',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'dims-admin-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
