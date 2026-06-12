import type { Prisma, PrismaClient } from '@prisma/client';
import { getPrisma } from '../db/prisma.js';
import type {
  AdminUserDetail,
  AdminUserListItem,
  PaginatedResult,
  RoleSummary,
} from '../types/users.types.js';
import type { ListUsersQuery, PatchUserBody } from '../validationSchemas/users.validationSchema.js';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function listUsers(
  query: ListUsersQuery,
): Promise<PaginatedResult<AdminUserListItem>> {
  const prisma = getPrisma();
  const where: Prisma.DIMSAdminUserWhereInput = {
    deletedAt: null,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q } },
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.dIMSAdminUser.count({ where }),
    prisma.dIMSAdminUser.findMany({
      where,
      orderBy: [{ email: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      isActive: r.isActive,
      lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
      roleNames: r.roles.map((j) => j.role.name),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function findUserDetail(
  id: string,
  tx?: PrismaLike,
): Promise<AdminUserDetail | null> {
  const prisma = tx ?? getPrisma();
  const row = await prisma.dIMSAdminUser.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profileImageUrl: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              isSystemRole: true,
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
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    profileImageUrl: row.profileImageUrl,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    roles: row.roles
      .filter((j) => j.role.deletedAt === null && j.role.isActive)
      .map(
        (j): RoleSummary => ({
          id: j.role.id,
          name: j.role.name,
          description: j.role.description,
          isSystemRole: j.role.isSystemRole,
        }),
      ),
  };
}

export async function updateUser(
  id: string,
  patch: PatchUserBody,
  tx?: PrismaLike,
): Promise<AdminUserDetail | null> {
  const client = tx ?? getPrisma();
  const data: Prisma.DIMSAdminUserUpdateInput = { updatedAt: new Date() };
  if (patch.firstName !== undefined) data.firstName = patch.firstName;
  if (patch.lastName !== undefined) data.lastName = patch.lastName;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  await client.dIMSAdminUser.update({ where: { id }, data });
  return findUserDetail(id, tx);
}

export async function findActiveRolesByIds(roleIds: readonly string[]): Promise<{ id: string }[]> {
  const prisma = getPrisma();
  return prisma.dIMSAdminRole.findMany({
    where: { id: { in: [...roleIds] }, deletedAt: null, isActive: true },
    select: { id: true },
  });
}

export async function attachRoles(
  userId: string,
  roleIds: readonly string[],
  assignedBy: string,
  tx?: PrismaLike,
): Promise<{ added: string[]; alreadyHad: string[] }> {
  const client = tx ?? getPrisma();
  const existing = await client.dIMSAdminUserRole.findMany({
    where: { userId, roleId: { in: [...roleIds] } },
    select: { roleId: true },
  });
  const existingIds = new Set(existing.map((r) => r.roleId));
  const toAdd = roleIds.filter((id) => !existingIds.has(id));

  if (toAdd.length > 0) {
    await client.dIMSAdminUserRole.createMany({
      data: toAdd.map((roleId) => ({ userId, roleId, assignedBy })),
    });
  }

  return {
    added: toAdd,
    alreadyHad: roleIds.filter((id) => existingIds.has(id)),
  };
}

export async function detachRole(
  userId: string,
  roleId: string,
  tx?: PrismaLike,
): Promise<boolean> {
  const client = tx ?? getPrisma();
  const result = await client.dIMSAdminUserRole.deleteMany({ where: { userId, roleId } });
  return result.count > 0;
}
