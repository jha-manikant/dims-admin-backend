import { cacheConfig } from '../configs/cache.js';
import { logger } from '../utils/logger.js';
import { getRedis } from './redis.js';
import { cacheKeys } from './keys.js';

/**
 * Read-through cache for a user's resolved permission keys.
 *
 * Cache reads degrade quietly — a Redis hiccup just makes the next request
 * slower. Writes/deletes log at `warn` because a missed DEL leaves stale
 * authorization in place; ops need to see it (best-practices rule #29).
 */

export async function getCachedPermissions(userId: string): Promise<string[] | null> {
  try {
    const raw = await getRedis().get(cacheKeys.permission(userId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((v): v is string => typeof v === 'string')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedPermissions(userId: string, keys: string[]): Promise<void> {
  try {
    await getRedis().set(
      cacheKeys.permission(userId),
      JSON.stringify(keys),
      'EX',
      cacheConfig.permissionTtlSeconds,
    );
  } catch (err) {
    logger.warn({ err, userId }, 'permission_cache_set_failed');
  }
}

export async function invalidateUserPermissions(userId: string): Promise<void> {
  try {
    await getRedis().del(cacheKeys.permission(userId));
  } catch (err) {
    logger.warn({ err, userId }, 'permission_cache_invalidate_failed');
  }
}

export async function invalidateManyUserPermissions(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const keys = userIds.map((id) => cacheKeys.permission(id));
  try {
    await getRedis().del(...keys);
    logger.debug({ count: userIds.length }, 'permission_cache_bulk_invalidated');
  } catch (err) {
    logger.warn({ err, count: userIds.length }, 'permission_cache_bulk_invalidate_failed');
  }
}
