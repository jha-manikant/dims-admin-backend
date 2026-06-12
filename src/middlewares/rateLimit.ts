import type { RequestHandler } from 'express';
import rateLimitLib from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { getRedis } from '../cache/redis.js';
import { cacheConfig } from '../configs/cache.js';

/**
 * Per-IP rate limiter (best-practices rule #19). Counters live in Redis so
 * they are shared across instances and survive restarts. `opts.name` keeps
 * `auth`/`admin` buckets in separate key namespaces.
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
    store: new RedisStore({
      sendCommand: async (...args: string[]): Promise<RedisReply> => {
        const [command, ...rest] = args as [string, ...string[]];
        return (await getRedis().call(command, ...rest)) as RedisReply;
      },
      prefix: `${cacheConfig.keyPrefixes.rateLimit}${opts.name}:`,
    }),
    statusCode: 429,
  });
}

export const authRateLimit = makeRateLimit({ windowMs: 60_000, max: 30, name: 'auth' });
export const adminRateLimit = makeRateLimit({ windowMs: 60_000, max: 120, name: 'admin' });
