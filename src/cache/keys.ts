import { cacheConfig } from '../configs/cache.js';

/**
 * Typed Redis key builders. All keys go through here so renames are mechanical
 * and we never have a typo'd string literal floating around.
 */
export const cacheKeys = {
  permission: (userId: string): string => `${cacheConfig.keyPrefixes.permission}${userId}`,
  session: (sessionId: string): string => `${cacheConfig.keyPrefixes.session}${sessionId}`,
  rateLimit: (bucket: string, identifier: string): string =>
    `${cacheConfig.keyPrefixes.rateLimit}${bucket}:${identifier}`,
  idempotency: (key: string): string => `${cacheConfig.keyPrefixes.idempotency}${key}`,
} as const;
