import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../errors/index.js';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route', { method: req.method, path: req.originalUrl }));
}
