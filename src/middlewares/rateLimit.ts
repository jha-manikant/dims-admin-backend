import type { RequestHandler } from 'express';
import rateLimitLib from 'express-rate-limit';
// import { RedisStore, type RedisReply } from 'rate-limit-redis'; // Redis disabled
// import { getRedis } from '../cache/redis.js'; // Redis disabled
// import { cacheConfig } from '../configs/cache.js'; // Redis disabled

/**
 * Per-IP rate limiter (best-practices rule #19). Counters live in
 * `express-rate-limit`'s built-in in-memory store: they are per-process and
 * reset on restart, which is fine for the single-instance deployment. IP
 * keying still works via the default key generator (`req.ip`), which honors
 * the production `trust proxy` setting. `opts.name` is retained for readability.
 *
 * Redis-backed counters disabled for the single-server deployment. To re-enable
 * (shared across instances), restore the `rate-limit-redis`/`getRedis`/
 * `cacheConfig` imports and the commented `store` block below.
 */
export function makeRateLimit(opts: {
  windowMs: number;
  max: number;
  name: string;
}): RequestHandler {
  return rateLimitLib({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests' },
    // store: new RedisStore({
    //   sendCommand: async (...args: string[]): Promise<RedisReply> => {
    //     const [command, ...rest] = args as [string, ...string[]];
    //     return (await getRedis().call(command, ...rest)) as RedisReply;
    //   },
    //   prefix: `${cacheConfig.keyPrefixes.rateLimit}${opts.name}:`,
    // }),
    statusCode: 429,
  });
}

export const authRateLimit = makeRateLimit({ windowMs: 60_000, max: 30, name: 'auth' });
export const adminRateLimit = makeRateLimit({ windowMs: 60_000, max: 120, name: 'admin' });
