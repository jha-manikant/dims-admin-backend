import { env } from './env.js';

/**
 * Central cache config. The key prefixes are the single source of truth so
 * renames stay mechanical. `redisUrl` is disabled along with the Redis-backed
 * stores (single-server deploy) — re-add it when Redis returns.
 */
export const cacheConfig = {
  // redisUrl: env.REDIS_URL, // Redis disabled — single-server deploy
  permissionTtlSeconds: env.PERMISSION_CACHE_TTL_SECONDS,
  keyPrefixes: {
    permission: 'perm:user:',
    session: 'session:',
    rateLimit: 'rl:',
    idempotency: 'idemp:',
  },
} as const;
