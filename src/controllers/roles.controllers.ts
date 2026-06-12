import type { Request, Response } from 'express';
import * as service from '../services/roles.services.js';
import {
  createRoleBody,
  patchRoleBody,
  roleIdParam,
  setRolePermissionsBody,
} from '../validationSchemas/roles.validationSchema.js';

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await service.list();
  res.status(200).json({ roles });
}

export async function getRole(req: Request, res: Response): Promise<void> {
  const { id } = roleIdParam.parse(req.params);
  const role = await service.get(id);
  res.status(200).json({ role });
}

export async function createRole(req: Request, res: Response): Promise<void> {
  const body = createRoleBody.parse(req.body);
  const role = await service.create(req, body);
  res.status(201).json({ role });
}

export async function patchRole(req: Request, res: Response): Promise<void> {
  const { id } = roleIdParam.parse(req.params);
  const body = patchRoleBody.parse(req.body);
  const role = await service.update(req, id, body);
  res.status(200).json({ role });
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  const { id } = roleIdParam.parse(req.params);
  await service.remove(req, id);
  res.status(204).end();
}

export async function setRolePermissions(req: Request, res: Response): Promise<void> {
  const { id } = roleIdParam.parse(req.params);
  const body = setRolePermissionsBody.parse(req.body);
  const role = await service.setPermissions(req, id, body);
  res.status(200).json({ role });
}
