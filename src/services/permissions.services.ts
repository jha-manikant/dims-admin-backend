import * as repo from '../repositories/permissions.repositories.js';
import { NotFoundError } from '../errors/index.js';
import type { PermissionDetail, PermissionItem } from '../types/permissions.types.js';

export async function list(): Promise<PermissionItem[]> {
  return repo.listPermissions();
}

export async function get(id: string): Promise<PermissionDetail> {
  const permission = await repo.findPermissionDetail(id);
  if (!permission) throw new NotFoundError('Permission');
  return permission;
}
