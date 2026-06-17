// import RedisStore from 'connect-redis'; // Redis disabled — see DB-backed store below
import type { RequestHandler } from 'express';
import session, { type SessionOptions } from 'express-session';
// import { getRedis } from '../cache/redis.js'; // Redis disabled
import { authConfig } from '../configs/auth.js';
// import { cacheConfig } from '../configs/cache.js'; // Redis disabled
import { PrismaSessionStore } from './prismaSessionStore.js';

/**
 * HttpOnly session cookie backed by the SQL Server database via Prisma
 * (best-practices rules #13, #18). Sessions survive process restarts — no
 * separate Redis/session server required. Cookie shape is set in
 * `authConfig.session.cookie`.
 *
 * Redis-backed store disabled for the single-server deployment. To re-enable,
 * restore the `connect-redis`/`getRedis`/`cacheConfig` imports above and swap
 * the `store` back to the commented `RedisStore` block below.
 */
export function makeSessionMiddleware(): RequestHandler {
  const options: SessionOptions = {
    // store: new RedisStore({
    //   client: getRedis(),
    //   prefix: cacheConfig.keyPrefixes.session,
    // }),
    store: new PrismaSessionStore(),
    name: authConfig.session.cookieName,
    secret: authConfig.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...authConfig.session.cookie },
  };
  return session(options);
}
