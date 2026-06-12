import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PermissionKey } from '../constants/permissions.js';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

/**
 * Gate a route by a single permission key.
 *
 * Mount AFTER `authenticate` and `loadPermissions` — those populate `req.user`
 * and `req.permissions` respectively. This middleware is the single source of
 * truth for authorization decisions; controllers must not duplicate it
 * (best-practices rule #14).
 */
export function requirePermission(key: PermissionKey): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Sign in required');
    }
    if (!req.permissions) {
      // Misconfigured route — fail closed.
      throw new ForbiddenError('Permissions not loaded for this request', {
        code: 'PERMISSIONS_NOT_LOADED',
      });
    }
    if (!req.permissions.has(key)) {
      throw ForbiddenError.missingPermission(key);
    }
    next();
  };
}
