import type { Request, Response } from 'express';
import * as service from '../services/permissions.services.js';
import { permissionIdParam } from '../validationSchemas/permissions.validationSchema.js';

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  const permissions = await service.list();
  res.status(200).json({ permissions });
}

export async function getPermission(req: Request, res: Response): Promise<void> {
  const { id } = permissionIdParam.parse(req.params);
  const permission = await service.get(id);
  res.status(200).json({ permission });
}
