import type { RequestHandler } from 'express';
import helmetLib from 'helmet';

/**
 * Security headers (best-practices rule #20). Defaults are sensible; tighten
 * CSP in Phase 8 once the frontend's external asset origins are known.
 */
export const helmet: RequestHandler = helmetLib({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Allow Swagger UI to load its own assets in dev.
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
});
