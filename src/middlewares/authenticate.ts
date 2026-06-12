import type { NextFunction, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.js';
import { UnauthorizedError } from '../errors/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Resolves the cookie-based session into a hydrated `req.user`.
 *
 * - Reads `req.session.adminUserId` (set by the Google sign-in callback).
 * - Looks up the user row; rejects if soft-deleted or `IsActive=0`.
 * - Populates `req.user` for downstream middleware/handlers.
 *
 * Throws `UnauthorizedError` (401) on any miss. Permissions are loaded by a
 * separate middleware (`loadPermissions`) so this stays cheap and reusable
 * even on routes that don't gate by permission (e.g. `/me`).
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const adminUserId = req.session.adminUserId;
    if (!adminUserId) {
      throw new UnauthorizedError('Sign in required');
    }

    const prisma = getPrisma();
    const user = await prisma.dIMSAdminUser.findFirst({
      where: { id: adminUserId, deletedAt: null, isActive: true },
      select: {
        id: true,
        googleId: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
    if (!user) {
      // The session points at a user that no longer exists / was deactivated.
      // Burn the cookie so the next request hits the login flow cleanly.
      req.session.destroy(() => undefined);
      throw new UnauthorizedError('Session is no longer valid');
    }

    req.user = user;
    next();
  },
);
