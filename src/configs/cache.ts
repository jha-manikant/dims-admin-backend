import { env } from './env.js';

/**
 * Central cache config. `redisUrl` is required (validated by env.ts) and the
 * key prefixes are the single source of truth so renames stay mechanical.
 */
export const cacheConfig = {
  redisUrl: env.REDIS_URL,
  permissionTtlSeconds: env.PERMISSION_CACHE_TTL_SECONDS,
  keyPrefixes: {
    permission: 'perm:user:',
    session: 'session:',
    rateLimit: 'rl:',
    idempotency: 'idemp:',
  },
} as const;
