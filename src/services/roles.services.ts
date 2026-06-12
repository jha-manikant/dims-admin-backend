import type { Request } from 'express';
import { auditContext, writeAudit } from '../audit/audit.writer.js';
import { invalidateManyUserPermissions } from '../cache/permissionsCache.js';
import { getPrisma } from '../db/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors/index.js';
import * as repo from '../repositories/roles.repositories.js';
import type { RoleDetail, RoleListItem } from '../types/roles.types.js';
import type {
  CreateRoleBody,
  PatchRoleBody,
  SetRolePermissionsBody,
} from '../validationSchemas/roles.validationSchema.js';

export async function list(): Promise<RoleListItem[]> {
  return repo.listRoles();
}

export async function get(id: string): Promise<RoleDetail> {
  const role = await repo.findRoleDetail(id);
  if (!role) throw new NotFoundError('Role');
  return role;
}

export async function create(req: Request, body: CreateRoleBody): Promise<RoleDetail> {
  const existing = await repo.findRoleByName(body.name);
  if (existing) {
    throw new ConflictError('A role with this name already exists', { name: body.name });
  }

  const permissionIds = body.permissionIds ?? [];
  if (permissionIds.length > 0) {
    const found = await repo.findActivePermissionsByIds(permissionIds);
    if (found.length !== permissionIds.length) {
      const foundSet = new Set(found.map((p) => p.id));
      const missing = permissionIds.filter((pid) => !foundSet.has(pid));
      throw new ValidationError('One or more permissions do not exist or are inactive', {
        missing,
      });
    }
  }

  const prisma = getPrisma();
  const id = await prisma.$transaction(async (tx) => {
    const newId = await repo.createRole(
      { name: body.name, description: body.description ?? null, permissionIds },
      tx,
    );
    await writeAudit(
      {
        ...auditContext(req),
        action: 'Role.Created',
        entityType: 'Role',
        entityId: newId,
        newValues: { name: body.name, description: body.description ?? null, permissionIds },
      },
      tx,
    );
    return newId;
  });

  const role = await repo.findRoleDetail(id);
  if (!role) throw new NotFoundError('Role');
  return role;
}

export async function update(req: Request, id: string, patch: PatchRoleBody): Promise<RoleDetail> {
  const before = await repo.findRoleDetail(id);
  if (!before) throw new NotFoundError('Role');
  if (before.isSystemRole && (patch.name !== undefined || patch.isActive !== undefined)) {
    throw new ForbiddenError('System roles cannot be renamed or deactivated', {
      code: 'SYSTEM_ROLE_IMMUTABLE',
    });
  }
  if (patch.name !== undefined && patch.name !== before.name) {
    const dup = await repo.findRoleByName(patch.name);
    if (dup && dup.id !== id) {
      throw new ConflictError('A role with this name already exists', { name: patch.name });
    }
  }

  const prisma = getPrisma();
  const affectedUserIds = await prisma.$transaction(async (tx) => {
    // Capture inside the tx so deactivation invalidations match the state
    // we're about to commit.
    const userIds =
      patch.isActive === false ? await repo.findUserIdsByRoleId(id, tx) : [];
    await repo.patchRole(id, patch, tx);
    await writeAudit(
      {
        ...auditContext(req),
        action: 'Role.Updated',
        entityType: 'Role',
        entityId: id,
        oldValues: {
          name: before.name,
          description: before.description,
          isActive: before.isActive,
        },
        newValues: patch,
      },
      tx,
    );
    return userIds;
  });

  if (affectedUserIds.length > 0) {
    await invalidateManyUserPermissions(affectedUserIds);
  }

  const after = await repo.findRoleDetail(id);
  if (!after) throw new NotFoundError('Role');
  return after;
}

export async function remove(req: Request, id: string): Promise<void> {
  const before = await repo.findRoleDetail(id);
  if (!before) throw new NotFoundError('Role');
  if (before.isSystemRole) {
    throw new ForbiddenError('System roles cannot be deleted', { code: 'SYSTEM_ROLE_IMMUTABLE' });
  }

  const prisma = getPrisma();
  const affectedUserIds = await prisma.$transaction(async (tx) => {
    // Capture before softDeleteRole drops the DIMSAdminUserRole rows.
    const userIds = await repo.findUserIdsByRoleId(id, tx);
    await repo.softDeleteRole(id, tx);
    await writeAudit(
      {
        ...auditContext(req),
        action: 'Role.Deleted',
        entityType: 'Role',
        entityId: id,
        oldValues: { name: before.name },
      },
      tx,
    );
    return userIds;
  });

  await invalidateManyUserPermissions(affectedUserIds);
}

export async function setPermissions(
  req: Request,
  id: string,
  body: SetRolePermissionsBody,
): Promise<RoleDetail> {
  const before = await repo.findRoleDetail(id);
  if (!before) throw new NotFoundError('Role');

  if (body.permissionIds.length > 0) {
    const found = await repo.findActivePermissionsByIds(body.permissionIds);
    if (found.length !== body.permissionIds.length) {
      const foundSet = new Set(found.map((p) => p.id));
      const missing = body.permissionIds.filter((pid) => !foundSet.has(pid));
      throw new ValidationError('One or more permissions do not exist or are inactive', {
        missing,
      });
    }
  }

  const prisma = getPrisma();
  const affectedUserIds = await prisma.$transaction(async (tx) => {
    const userIds = await repo.findUserIdsByRoleId(id, tx);
    const { added, removed } = await repo.setRolePermissions(id, body.permissionIds, tx);
    await writeAudit(
      {
        ...auditContext(req),
        action: 'Role.PermissionsUpdated',
        entityType: 'Role',
        entityId: id,
        newValues: { added, removed },
      },
      tx,
    );
    return userIds;
  });

  await invalidateManyUserPermissions(affectedUserIds);

  const after = await repo.findRoleDetail(id);
  if (!after) throw new NotFoundError('Role');
  return after;
}
