import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { loadPermissions } from '../middlewares/loadPermissions.js';
import { assertAuthed } from '../utils/assertAuthed.js';

export const meRouter = Router();

/**
 * GET /me
 *
 * Returns the signed-in user's identity and current permission keys. The
 * frontend uses the permission list for UX gating only — the server enforces
 * authorization independently on every protected route.
 *
 * Loaded fresh from DB each call (no caching in v1) so role revocation is
 * effective immediately.
 */
meRouter.get('/', authenticate, loadPermissions, (req: Request, res: Response): void => {
  assertAuthed(req);
  res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isActive: req.user.isActive,
    },
    permissions: [...req.permissions],
  });
});
