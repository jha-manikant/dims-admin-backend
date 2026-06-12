import { PrismaClient } from '@prisma/client';
import { isProduction } from '../configs/env.js';
import { logger } from '../utils/logger.js';

/**
 * Build the PrismaClient with explicit `emit: 'event'` log entries. Defining
 * the factory lets TypeScript infer the precise generic from the `log` array
 * — without the factory, annotating `client: PrismaClient` widens the events
 * to `never` and `$on('query', ...)` fails strict typecheck.
 */
function makePrismaClient() {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
}

type Client = ReturnType<typeof makePrismaClient>;

let client: Client | null = null;

/**
 * PrismaClient singleton. Query events bridge to Pino — `debug` in dev,
 * suppressed in production to avoid per-query overhead.
 */
export function getPrisma(): Client {
  if (!client) {
    client = makePrismaClient();

    client.$on('error', (e) => {
      logger.error({ event: e }, 'prisma_error');
    });
    client.$on('warn', (e) => {
      logger.warn({ event: e }, 'prisma_warn');
    });
    if (!isProduction) {
      client.$on('query', (e) => {
        logger.debug({ query: e.query, params: e.params, durationMs: e.duration }, 'prisma_query');
      });
    }
  }
  return client;
}

export async function closePrisma(): Promise<void> {
  if (!client) return;
  try {
    await client.$disconnect();
  } catch (err) {
    logger.warn({ err }, 'prisma_disconnect_failed');
  }
  client = null;
}

export async function pingPrisma(timeoutMs = 500): Promise<boolean> {
  const prisma = getPrisma();
  try {
    const result = await Promise.race([
      prisma.$queryRawUnsafe<{ ok: number }[]>('SELECT 1 AS ok'),
      new Promise<'TIMEOUT'>((resolve) => {
        setTimeout(() => {
          resolve('TIMEOUT');
        }, timeoutMs);
      }),
    ]);
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}
