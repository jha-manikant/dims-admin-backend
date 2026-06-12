import { z } from 'zod';

const uuid = z.string().uuid();

export const userIdParam = z.object({ id: uuid });

export const userAndRoleIdParam = z.object({
  id: uuid,
  roleId: uuid,
});

export const listUsersQuery = z.object({
  q: z.string().trim().max(255).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : 1))
    .pipe(z.number().int().positive().max(10_000)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? Number.parseInt(v, 10) : 25))
    .pipe(z.number().int().positive().max(200)),
});

export const patchUserBody = z
  .object({
    firstName: z.string().trim().max(100).nullable().optional(),
    lastName: z.string().trim().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export const assignRolesBody = z.object({
  roleIds: z.array(uuid).min(1).max(50),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type PatchUserBody = z.infer<typeof patchUserBody>;
export type AssignRolesBody = z.infer<typeof assignRolesBody>;
