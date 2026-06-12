import { z } from 'zod';

const uuid = z.string().uuid();

export const roleIdParam = z.object({ id: uuid });

export const createRoleBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  permissionIds: z.array(uuid).max(200).optional(),
});

export const patchRoleBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export const setRolePermissionsBody = z.object({
  permissionIds: z.array(uuid).max(200),
});

export type CreateRoleBody = z.infer<typeof createRoleBody>;
export type PatchRoleBody = z.infer<typeof patchRoleBody>;
export type SetRolePermissionsBody = z.infer<typeof setRolePermissionsBody>;
