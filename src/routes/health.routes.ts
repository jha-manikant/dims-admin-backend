import { Router, type Request, type Response } from 'express';
// import { pingRedis } from '../cache/redis.js'; // Redis disabled — single-server deploy
import { pingPrisma } from '../db/prisma.js';

export const healthRouter = Router();

/**
 * Liveness probe — always 200 if the process is up. Used by orchestrators
 * to decide whether to restart the container.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Readiness probe — 200 only when the database is reachable. (Redis check
 * disabled for the single-server deployment; sessions now live in the DB, so
 * the DB ping covers session-store readiness too.)
 */
healthRouter.get('/ready', (req: Request, res: Response, next) => {
  pingPrisma(500)
    .then((dbOk) => {
      const body = {
        status: dbOk ? 'ok' : 'degraded',
        checks: { db: dbOk },
        requestId: req.requestId,
      };
      res.status(dbOk ? 200 : 503).json(body);
    })
    .catch(next);
});
