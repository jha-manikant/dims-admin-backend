import type { NextFunction, Request, Response } from 'express';
import { getCachedPermissions, setCachedPermissions } from '../cache/permissionsCache.js';
import { getPrisma } from '../db/prisma.js';
import { UnauthorizedError } from '../errors/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Resolves the authenticated user's permission keys and stores them as
 * `req.permissions` (Set for O(1) lookup).
 *
 * Read-through cache against `perm:user:{id}`. Misses fall back to the DB
 * and warm the cache; mutations in `users.services.ts` and `roles.services.ts`
 * invalidate affected user keys so revoked access takes effect on the next
 * request (best-practices rule #29).
 */
export const loadPermissions = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Sign in required');
    }

    const cached = await getCachedPermissions(req.user.id);
    if (cached) {
      req.permissions = new Set(cached);
      next();
      return;
    }

    const prisma = getPrisma();
    const rows = await prisma.dIMSAdminPermission.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        roles: {
          some: {
            role: {
              deletedAt: null,
              isActive: true,
              users: { some: { userId: req.user.id } },
            },
          },
        },
      },
      select: { permissionKey: true },
    });

    const keys = rows.map((r) => r.permissionKey);
    await setCachedPermissions(req.user.id, keys);
    req.permissions = new Set(keys);
    next();
  },
);
