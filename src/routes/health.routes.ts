import { Router, type Request, type Response } from 'express';
import { pingRedis } from '../cache/redis.js';
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
 * Readiness probe — 200 only when both the database and Redis are reachable.
 */
healthRouter.get('/ready', (req: Request, res: Response, next) => {
  Promise.all([pingPrisma(500), pingRedis(500)])
    .then(([dbOk, redisOk]) => {
      const ok = dbOk && redisOk;
      const body = {
        status: ok ? 'ok' : 'degraded',
        checks: { db: dbOk, redis: redisOk },
        requestId: req.requestId,
      };
      res.status(ok ? 200 : 503).json(body);
    })
    .catch(next);
});
