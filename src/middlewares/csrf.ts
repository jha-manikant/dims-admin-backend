import type { NextFunction, Request, Response } from 'express';
import { appConfig } from '../configs/app.js';
import { ForbiddenError } from '../errors/index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Lightweight CSRF guard. Cookie-based sessions are vulnerable to cross-site
 * POSTs even with SameSite=Lax (browsers differ; older user agents are more
 * permissive). For every mutating request we additionally require the Origin
 * (or Referer) header to be in the CORS allowlist.
 *
 * This is a defense-in-depth check on top of CORS.
 */
export function csrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const origin = req.header('origin') ?? extractOriginFromReferer(req.header('referer'));
  if (!origin) {
    throw new ForbiddenError('Missing Origin / Referer on mutating request', {
      code: 'CSRF_MISSING_ORIGIN',
    });
  }
  if (!appConfig.corsOrigins.includes(origin)) {
    throw new ForbiddenError('Origin not allowed for mutating requests', {
      code: 'CSRF_DISALLOWED_ORIGIN',
      origin,
    });
  }
  next();
}

function extractOriginFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}
