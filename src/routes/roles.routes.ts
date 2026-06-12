import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as controller from '../controllers/roles.controllers.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loadPermissions } from '../middlewares/loadPermissions.js';
import { requirePermission } from '../middlewares/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const rolesRouter = Router();

rolesRouter.use(authenticate, loadPermissions);

rolesRouter.get('/', requirePermission(PERMISSIONS.RolesView), asyncHandler(controller.listRoles));
rolesRouter.get('/:id', requirePermission(PERMISSIONS.RolesView), asyncHandler(controller.getRole));
rolesRouter.post(
  '/',
  requirePermission(PERMISSIONS.RolesManage),
  asyncHandler(controller.createRole),
);
rolesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.RolesManage),
  asyncHandler(controller.patchRole),
);
rolesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.RolesManage),
  asyncHandler(controller.deleteRole),
);
rolesRouter.put(
  '/:id/permissions',
  requirePermission(PERMISSIONS.RolesManage),
  asyncHandler(controller.setRolePermissions),
);
