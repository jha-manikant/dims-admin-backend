import corsLib from 'cors';
import type { RequestHandler } from 'express';
import { appConfig } from '../configs/app.js';

/**
 * Strict CORS allowlist (best-practices rule #21). No wildcards; rejected
 * origins receive no CORS headers and the browser blocks them.
 */
export const cors: RequestHandler = corsLib({
  origin(origin, callback) {
    // Same-origin / curl requests have no Origin header — allow.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (appConfig.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
});
