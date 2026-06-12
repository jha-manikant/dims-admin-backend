import { Router } from 'express';
import { PERMISSIONS } from '../constants/permissions.js';
import * as controller from '../controllers/labs.controllers.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loadPermissions } from '../middlewares/loadPermissions.js';
import { requirePermission } from '../middlewares/requirePermission.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Labs DIMS-proxy routes. Reference template for every DIMS module: each
 * endpoint is gated by exactly one `PERMISSIONS.*` key, and the matching
 * `labs.services.ts` method forwards that same key to DIMS via `callDims`.
 * Role → permission assignment in the DB decides who can reach each endpoint.
 */
export const labsRouter = Router();

labsRouter.use(authenticate, loadPermissions);

labsRouter.get(
  '/',
  requirePermission(PERMISSIONS.LabsView),
  asyncHandler(controller.listLabs),
);
labsRouter.post(
  '/',
  requirePermission(PERMISSIONS.LabsCreate),
  asyncHandler(controller.createLab),
);
labsRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.LabsEdit),
  asyncHandler(controller.updateLab),
);
labsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.LabsDelete),
  asyncHandler(controller.deleteLab),
);
