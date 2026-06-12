import type { Request, Response } from 'express';
import * as service from '../services/users.services.js';
import {
  assignRolesBody,
  listUsersQuery,
  patchUserBody,
  userAndRoleIdParam,
  userIdParam,
} from '../validationSchemas/users.validationSchema.js';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = listUsersQuery.parse(req.query);
  const result = await service.list(query);
  res.status(200).json(result);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = userIdParam.parse(req.params);
  const user = await service.get(id);
  res.status(200).json({ user });
}

export async function patchUser(req: Request, res: Response): Promise<void> {
  const { id } = userIdParam.parse(req.params);
  const body = patchUserBody.parse(req.body);
  const user = await service.update(req, id, body);
  res.status(200).json({ user });
}

export async function assignRoles(req: Request, res: Response): Promise<void> {
  const { id } = userIdParam.parse(req.params);
  const { roleIds } = assignRolesBody.parse(req.body);
  const user = await service.assignRoles(req, id, roleIds);
  res.status(200).json({ user });
}

export async function revokeRole(req: Request, res: Response): Promise<void> {
  const { id, roleId } = userAndRoleIdParam.parse(req.params);
  const user = await service.revokeRole(req, id, roleId);
  res.status(200).json({ user });
}
