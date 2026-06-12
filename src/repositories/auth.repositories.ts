import { getPrisma } from '../db/prisma.js';
import type { AdminUserPublic, VerifiedGoogleClaims } from '../types/auth.types.js';

/**
 * Upsert keyed on Google `sub` (which we store as `googleId`).
 *
 * - New user → created with zero roles (the SuperAdmin assigns roles later).
 * - Existing user → profile fields are refreshed from Google (people update
 *   their names / photos), `lastLoginAt` is bumped.
 *
 * The soft-delete predicate is checked against `googleId` only: a previously
 * soft-deleted user signing back in is intentionally NOT auto-revived — they
 * appear in the DB but auth middleware will reject them as `deletedAt != null`.
 */
export async function upsertUserOnGoogleSignIn(
  claims: VerifiedGoogleClaims,
): Promise<AdminUserPublic> {
  const prisma = getPrisma();

  const existing = await prisma.dIMSAdminUser.findFirst({
    where: { googleId: claims.sub },
    select: { id: true, deletedAt: true },
  });

  const data = {
    googleId: claims.sub,
    email: claims.email,
    firstName: claims.firstName,
    lastName: claims.lastName,
    profileImageUrl: claims.picture,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };

  const row = existing
    ? await prisma.dIMSAdminUser.update({
        where: { id: existing.id },
        data,
        select: publicSelect,
      })
    : await prisma.dIMSAdminUser.create({
        data,
        select: publicSelect,
      });

  return projectPublic(row);
}

const publicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  isActive: true,
  lastLoginAt: true,
} as const;

interface Row {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

function projectPublic(row: Row): AdminUserPublic {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    profileImageUrl: row.profileImageUrl,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}
