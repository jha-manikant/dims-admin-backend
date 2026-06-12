import RedisStore from 'connect-redis';
import type { RequestHandler } from 'express';
import session, { type SessionOptions } from 'express-session';
import { getRedis } from '../cache/redis.js';
import { authConfig } from '../configs/auth.js';
import { cacheConfig } from '../configs/cache.js';

/**
 * HttpOnly session cookie backed by a Redis store (best-practices rules
 * #13, #18). Sessions survive process restarts and are shared across
 * instances. Cookie shape is set in `authConfig.session.cookie`.
 */
export function makeSessionMiddleware(): RequestHandler {
  const options: SessionOptions = {
    store: new RedisStore({
      client: getRedis(),
      prefix: cacheConfig.keyPrefixes.session,
    }),
    name: authConfig.session.cookieName,
    secret: authConfig.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...authConfig.session.cookie },
  };
  return session(options);
}
