import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 doesn't propagate errors thrown by async route handlers — a
 * rejected Promise just unhandled-rejects and the global error middleware
 * never sees it. Wrap every async handler with this so `.catch(next)` runs.
 *
 * Express 5 removes the need for this, but we're on 4.x.
 */
export const asyncHandler =
  <P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
    fn: (
      req: Request<P, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction,
    ) => Promise<unknown>,
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
  (req, res, next): void => {
    fn(req, res, next).catch(next);
  };
