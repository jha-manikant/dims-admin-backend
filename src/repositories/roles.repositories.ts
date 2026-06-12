import type { Prisma, PrismaClient } from '@prisma/client';
import { getPrisma } from '../db/prisma.js';
import type { PermissionRef, RoleDetail, RoleListItem } from '../types/roles.types.js';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function listRoles(): Promise<RoleListItem[]> {
  const prisma = getPrisma();
  const rows = await prisma.dIMSAdminRole.findMany({
    where: { deletedAt: null },
    orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      isSystemRole: true,
      isActive: true,
      _count: { select: { permissions: true, users: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystemRole: r.isSystemRole,
    isActive: r.isActive,
    permissionCount: r._count.permissions,
    userCount: r._count.users,
  }));
}

export async function findRoleDetail(id: string): Promise<RoleDetail | null> {
  const prisma = getPrisma();
  const row = await prisma.dIMSAdminRole.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      isSystemRole: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        select: {
          permission: {
            select: {
              id: true,
              permissionKey: true,
              category: true,
              deletedAt: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystemRole: row.isSystemRole,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    permissions: row.permissions
      .filter((j) => j.permission.deletedAt === null && j.permission.isActive)
      .map(
        (j): PermissionRef => ({
          id: j.permission.id,
          permissionKey: j.permission.permissionKey,
          category: j.permission.category,
        }),
      ),
  };
}

export async function findRoleByName(name: string): Promise<{ id: string } | null> {
  const prisma = getPrisma();
  return prisma.dIMSAdminRole.findFirst({
    where: { name, deletedAt: null },
    select: { id: true },
  });
}

export async function findActivePermissionsByIds(
  permissionIds: readonly string[],
): Promise<{ id: string }[]> {
  const prisma = getPrisma();
  return prisma.dIMSAdminPermission.findMany({
    where: { id: { in: [...permissionIds] }, deletedAt: null, isActive: true },
    select: { id: true },
  });
}

export async function findUserIdsByRoleId(roleId: string, tx?: PrismaLike): Promise<string[]> {
  const client = tx ?? getPrisma();
  const rows = await client.dIMSAdminUserRole.findMany({
    where: { roleId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function createRole(
  input: { name: string; description: string | null; permissionIds: readonly string[] },
  tx?: PrismaLike,
): Promise<string> {
  const client = tx ?? getPrisma();
  const role = await client.dIMSAdminRole.create({
    data: {
      name: input.name,
      description: input.description,
      isSystemRole: false,
      isActive: true,
      permissions: {
        create: input.permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
    select: { id: true },
  });
  return role.id;
}

export async function patchRole(
  id: string,
  patch: {
    name?: string | undefined;
    description?: string | null | undefined;
    isActive?: boolean | undefined;
  },
  tx?: PrismaLike,
): Promise<void> {
  const client = tx ?? getPrisma();
  const data: Prisma.DIMSAdminRoleUpdateInput = { updatedAt: new Date() };
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  await client.dIMSAdminRole.update({ where: { id }, data });
}

export async function softDeleteRole(id: string, tx?: PrismaLike): Promise<void> {
  const client = tx ?? getPrisma();
  await client.dIMSAdminRole.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date(), isActive: false },
  });
  // Also drop user→role assignments for this role.
  await client.dIMSAdminUserRole.deleteMany({ where: { roleId: id } });
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: readonly string[],
  tx?: PrismaLike,
): Promise<{ added: string[]; removed: string[] }> {
  const client = tx ?? getPrisma();
  const existing = await client.dIMSAdminRolePermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  const existingIds = new Set(existing.map((r) => r.permissionId));
  const desired = new Set(permissionIds);

  const toAdd = [...desired].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !desired.has(id));

  if (toRemove.length > 0) {
    await client.dIMSAdminRolePermission.deleteMany({
      where: { roleId, permissionId: { in: toRemove } },
    });
  }
  if (toAdd.length > 0) {
    await client.dIMSAdminRolePermission.createMany({
      data: toAdd.map((permissionId) => ({ roleId, permissionId })),
    });
  }
  return { added: toAdd, removed: toRemove };
}
