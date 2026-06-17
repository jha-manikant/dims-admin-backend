import 'reflect-metadata';

import express, { type Express } from 'express';
// Ambient .d.ts files in src/types/ are picked up automatically via tsconfig
// "include". No explicit import needed — they only contribute types.
import { appConfig } from './configs/app.js';
import { isProduction } from './configs/env.js';

import { cors } from './middlewares/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { helmet } from './middlewares/helmet.js';
import { httpLogger } from './middlewares/logger.js';
import { notFound } from './middlewares/notFound.js';
import { requestId } from './middlewares/requestId.js';

import { makeSessionMiddleware } from './middlewares/session.js';
import { healthRouter } from './routes/health.routes.js';
import { jwksRouter } from './routes/jwks.routes.js';

import { authRouter } from './routes/auth.routes.js';
import { dimsProxyRouter } from './routes/dims.routes.js';
import { meRouter } from './routes/me.routes.js';
import { permissionsRouter } from './routes/permissions.routes.js';
import { rolesRouter } from './routes/roles.routes.js';
import { usersRouter } from './routes/users.routes.js';

/**
 * Composes the Express app. Exported for tests so they can call `request(app)`
 * directly without binding a port.
 *
 * Middleware order matters:
 *   1. trust proxy (prod only)
 *   2. requestId      — must come before logger
 *   3. httpLogger     — child logger on req.log; everything after this is traced
 *   4. helmet         — security headers
 *   5. cors           — strict allowlist
 *   6. body parsers   — express.json / urlencoded
 *   7. health         — /health, /ready (kept BEFORE session so probes are infra-light)
 *   8. JWKS           — /.well-known/jwks.json + openid-configuration (no session)
 *   9. session        — express-session w/ DB-backed store (Prisma/SQL Server)
 *  10. /api/v1 router — feature modules: auth, me, admin/{users,roles,permissions}, dims
 *  11. notFound       — 404 for anything unmatched
 *  12. errorHandler   — global error translator (4-arg signature)
 */
export function createApp(): Express {
  const app = express();

  if (isProduction) {
    app.set('trust proxy', 1);
  }
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet);
  app.use(cors);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  // Health + JWKS sit BEFORE the session middleware so probes / DIMS' JWKS
  // fetcher never generate a session id (and never hit the session store).
  app.use(healthRouter);
  // /.well-known/* is rooted at the app, not under /api/v1 — JWKS discovery
  // is a fixed OIDC convention.
  app.use(jwksRouter);

  app.use(makeSessionMiddleware());

  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/me', meRouter);
  apiRouter.use('/admin/users', usersRouter);
  apiRouter.use('/admin/roles', rolesRouter);
  apiRouter.use('/admin/permissions', permissionsRouter);
  apiRouter.use('/dims', dimsProxyRouter);
  app.use(appConfig.apiBasePath, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
