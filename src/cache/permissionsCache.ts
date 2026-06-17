import { cacheConfig } from '../configs/cache.js';
import { logger } from '../utils/logger.js';
// import { getRedis } from './redis.js'; // Redis disabled — in-process cache below
import { cacheKeys } from './keys.js';

/**
 * Read-through cache for a user's resolved permission keys.
 *
 * In-process Map keyed by `perm:user:{id}` with a TTL (PERMISSION_CACHE_TTL_
 * SECONDS). Because invalidation runs in the same process that serves
 * requests, a revoked role takes effect on the next request immediately — fine
 * for the single-instance deployment. NOTE (multi-instance): an invalidation on
 * one replica does NOT clear another's copy; stale perms would persist until the
 * TTL lapses. Re-enable the Redis backend (commented block at the bottom) when a
 * shared cache is available.
 */

interface CacheEntry {
  keys: string[];
  expiresAt: number; // epoch ms
}

const permissionStore = new Map<string, CacheEntry>();

// Bounded, opportunistic sweep so the Map can't grow without limit if many
// distinct users authenticate and never return. Runs at most once per minute,
// on access — no timers, so it never keeps the event loop alive.
let lastSweep = 0;
function sweepExpired(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of permissionStore) {
    if (entry.expiresAt <= now) permissionStore.delete(key);
  }
}

// The Map operations are synchronous, but these keep their `Promise`-returning
// signatures so call sites (which `await` them) are unchanged and re-enabling
// the async Redis backend stays a drop-in swap.

export function getCachedPermissions(userId: string): Promise<string[] | null> {
  const now = Date.now();
  sweepExpired(now);
  const key = cacheKeys.permission(userId);
  const entry = permissionStore.get(key);
  if (!entry || entry.expiresAt <= now) {
    if (entry) permissionStore.delete(key);
    return Promise.resolve(null);
  }
  // Copy out so a caller mutating the array can't corrupt the cached entry.
  return Promise.resolve([...entry.keys]);
}

export function setCachedPermissions(userId: string, keys: string[]): Promise<void> {
  const expiresAt = Date.now() + cacheConfig.permissionTtlSeconds * 1000;
  permissionStore.set(cacheKeys.permission(userId), { keys: [...keys], expiresAt });
  return Promise.resolve();
}

export function invalidateUserPermissions(userId: string): Promise<void> {
  permissionStore.delete(cacheKeys.permission(userId));
  return Promise.resolve();
}

export function invalidateManyUserPermissions(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return Promise.resolve();
  for (const id of userIds) permissionStore.delete(cacheKeys.permission(id));
  logger.debug({ count: userIds.length }, 'permission_cache_bulk_invalidated');
  return Promise.resolve();
}

/*
 * --- Redis-backed implementation (disabled for single-server deployment) ---
 * Cache reads degrade quietly — a Redis hiccup just makes the next request
 * slower. Writes/deletes log at `warn` because a missed DEL leaves stale
 * authorization in place; ops need to see it (best-practices rule #29).
 * To re-enable: restore the `getRedis` import above and swap the four function
 * bodies for the ones below.
 *
 * export async function getCachedPermissions(userId: string): Promise<string[] | null> {
 *   try {
 *     const raw = await getRedis().get(cacheKeys.permission(userId));
 *     if (raw === null) return null;
 *     const parsed: unknown = JSON.parse(raw);
 *     if (!Array.isArray(parsed) || !parsed.every((v): v is string => typeof v === 'string')) {
 *       return null;
 *     }
 *     return parsed;
 *   } catch {
 *     return null;
 *   }
 * }
 *
 * export async function setCachedPermissions(userId: string, keys: string[]): Promise<void> {
 *   try {
 *     await getRedis().set(
 *       cacheKeys.permission(userId),
 *       JSON.stringify(keys),
 *       'EX',
 *       cacheConfig.permissionTtlSeconds,
 *     );
 *   } catch (err) {
 *     logger.warn({ err, userId }, 'permission_cache_set_failed');
 *   }
 * }
 *
 * export async function invalidateUserPermissions(userId: string): Promise<void> {
 *   try {
 *     await getRedis().del(cacheKeys.permission(userId));
 *   } catch (err) {
 *     logger.warn({ err, userId }, 'permission_cache_invalidate_failed');
 *   }
 * }
 *
 * export async function invalidateManyUserPermissions(userIds: string[]): Promise<void> {
 *   if (userIds.length === 0) return;
 *   const keys = userIds.map((id) => cacheKeys.permission(id));
 *   try {
 *     await getRedis().del(...keys);
 *     logger.debug({ count: userIds.length }, 'permission_cache_bulk_invalidated');
 *   } catch (err) {
 *     logger.warn({ err, count: userIds.length }, 'permission_cache_bulk_invalidate_failed');
 *   }
 * }
 */
