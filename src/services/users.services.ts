import type { Request } from 'express';
import { auditContext, writeAudit } from '../audit/audit.writer.js';
import { invalidateUserPermissions } from '../cache/permissionsCache.js';
import { getPrisma } from '../db/prisma.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import * as repo from '../repositories/users.repositories.js';
import type { AdminUserDetail, AdminUserListItem, PaginatedResult } from '../types/users.types.js';
import { assertAuthed } from '../utils/assertAuthed.js';
import type { ListUsersQuery, PatchUserBody } from '../validationSchemas/users.validationSchema.js';

export async function list(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
  return repo.listUsers(query);
}

export async function get(id: string): Promise<AdminUserDetail> {
  const user = await repo.findUserDetail(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function update(
  req: Request,
  id: string,
  patch: PatchUserBody,
): Promise<AdminUserDetail> {
  assertAuthed(req);
  const before = await repo.findUserDetail(id);
  if (!before) throw new NotFoundError('User');

  const prisma = getPrisma();
  const after = await prisma.$transaction(async (tx) => {
    const updated = await repo.updateUser(id, patch, tx);
    if (!updated) throw new NotFoundError('User');
    await writeAudit(
      {
        ...auditContext(req),
        action: 'User.Updated',
        entityType: 'User',
        entityId: id,
        oldValues: {
          firstName: before.firstName,
          lastName: before.lastName,
          isActive: before.isActive,
        },
        newValues: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          isActive: updated.isActive,
        },
      },
      tx,
    );
    return updated;
  });
  return after;
}

export async function assignRoles(
  req: Request,
  id: string,
  roleIds: string[],
): Promise<AdminUserDetail> {
  assertAuthed(req);
  const target = await repo.findUserDetail(id);
  if (!target) throw new NotFoundError('User');

  // Validate every role id maps to an active role.
  const found = await repo.findActiveRolesByIds(roleIds);
  if (found.length !== roleIds.length) {
    const foundSet = new Set(found.map((r) => r.id));
    const missing = roleIds.filter((rid) => !foundSet.has(rid));
    throw new ValidationError('One or more roles do not exist or are inactive', { missing });
  }

  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    const { added, alreadyHad } = await repo.attachRoles(id, roleIds, req.user.id, tx);
    await writeAudit(
      {
        ...auditContext(req),
        action: 'User.RolesAssigned',
        entityType: 'User',
        entityId: id,
        newValues: { added, alreadyHad },
      },
      tx,
    );
    const after = await repo.findUserDetail(id, tx);
    if (!after) throw new NotFoundError('User');
    return after;
  });
  await invalidateUserPermissions(id);
  return result;
}

export async function revokeRole(
  req: Request,
  userId: string,
  roleId: string,
): Promise<AdminUserDetail> {
  assertAuthed(req);
  const target = await repo.findUserDetail(userId);
  if (!target) throw new NotFoundError('User');

  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    const removed = await repo.detachRole(userId, roleId, tx);
    if (!removed) {
      throw new NotFoundError('Role assignment', { userId, roleId });
    }
    await writeAudit(
      {
        ...auditContext(req),
        action: 'User.RoleRevoked',
        entityType: 'User',
        entityId: userId,
        oldValues: { roleId },
      },
      tx,
    );
    const after = await repo.findUserDetail(userId, tx);
    if (!after) throw new NotFoundError('User');
    return after;
  });
  await invalidateUserPermissions(userId);
  return result;
}
