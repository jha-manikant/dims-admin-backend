import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as controller from '../controllers/users.controllers.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loadPermissions } from '../middlewares/loadPermissions.js';
import { requirePermission } from '../middlewares/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const usersRouter = Router();

// Every route below is authenticated + has its permissions loaded for
// requirePermission to consult. Permission gating per route reflects
// project.md's matrix.
usersRouter.use(authenticate, loadPermissions);

usersRouter.get('/', requirePermission(PERMISSIONS.UsersView), asyncHandler(controller.listUsers));

usersRouter.get('/:id', requirePermission(PERMISSIONS.UsersView), asyncHandler(controller.getUser));

usersRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.UsersEdit),
  asyncHandler(controller.patchUser),
);

usersRouter.post(
  '/:id/roles',
  requirePermission(PERMISSIONS.UsersAssignRoles),
  asyncHandler(controller.assignRoles),
);

usersRouter.delete(
  '/:id/roles/:roleId',
  requirePermission(PERMISSIONS.UsersAssignRoles),
  asyncHandler(controller.revokeRole),
);
