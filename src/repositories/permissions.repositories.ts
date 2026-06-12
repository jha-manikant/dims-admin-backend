import { getPrisma } from '../db/prisma.js';
import type { PermissionDetail, PermissionItem } from '../types/permissions.types.js';

export async function listPermissions(): Promise<PermissionItem[]> {
  const prisma = getPrisma();
  const rows = await prisma.dIMSAdminPermission.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { permissionKey: 'asc' }],
    select: {
      id: true,
      permissionKey: true,
      category: true,
      description: true,
      isActive: true,
    },
  });
  return rows;
}

export async function findPermissionDetail(id: string): Promise<PermissionDetail | null> {
  const prisma = getPrisma();
  const row = await prisma.dIMSAdminPermission.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      permissionKey: true,
      category: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { roles: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    permissionKey: row.permissionKey,
    category: row.category,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    roleCount: row._count.roles,
  };
}
