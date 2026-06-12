import type { NextFunction, Request, Response } from 'express';
import { isUuid, newId } from '../utils/ids.js';

const HEADER = 'x-request-id';
const MAX_INCOMING_LENGTH = 64;

/**
 * Assigns a per-request id. Reuses an incoming `X-Request-Id` header iff
 * it's a syntactically valid UUID and within length bounds — otherwise a
 * fresh UUID v7 is generated. Echoed back on the response so callers can
 * correlate logs.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id =
    incoming && incoming.length <= MAX_INCOMING_LENGTH && isUuid(incoming) ? incoming : newId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
