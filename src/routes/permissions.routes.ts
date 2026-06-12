import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as controller from '../controllers/permissions.controllers.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loadPermissions } from '../middlewares/loadPermissions.js';
import { requirePermission } from '../middlewares/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const permissionsRouter = Router();

permissionsRouter.use(authenticate, loadPermissions);

// Read-only catalog. Permission keys are code-defined (see
// `src/constants/permissions.ts`) and managed via DB migrations — there is
// deliberately no create/update/delete here, since a row only means anything
// once application code references its key via `requirePermission`.
permissionsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PermissionsView),
  asyncHandler(controller.listPermissions),
);
permissionsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PermissionsView),
  asyncHandler(controller.getPermission),
);
