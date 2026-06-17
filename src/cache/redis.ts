import { Redis } from 'ioredis';
import { env } from '../configs/env.js';
import { logger } from '../utils/logger.js';

let client: Redis | null = null;

/**
 * Redis singleton. Backs the session store, rate-limit counters, and the
 * permission read-through cache. Connects eagerly so a misconfigured
 * REDIS_URL fails the process at boot rather than at first request.
 */
export function getRedis(): Redis {
  if (!client) {
    // REDIS_URL is optional while the Redis backends are disabled; the fallback
    // only keeps this (currently unused) singleton type-safe. See cache configs.
    client = new Redis(env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    client.on('error', (err) => {
      logger.error({ err }, 'redis_error');
    });
    client.on('reconnecting', (delayMs: number) => {
      logger.warn({ delayMs }, 'redis_reconnecting');
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch (err) {
    logger.warn({ err }, 'redis_disconnect_failed');
  }
  client = null;
}

export async function pingRedis(timeoutMs = 500): Promise<boolean> {
  const redis = getRedis();
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<'TIMEOUT'>((resolve) => {
        setTimeout(() => {
          resolve('TIMEOUT');
        }, timeoutMs);
      }),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}
