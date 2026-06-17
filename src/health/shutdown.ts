import type { Server } from 'http';
// import { closeRedis } from '../cache/redis.js'; // Redis disabled — single-server deploy
import { closePrisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;

/**
 * Wires graceful-shutdown handlers (SIGTERM, SIGINT, uncaught errors) to the
 * given HTTP server (best-practices rule #42).
 *
 * Sequence:
 *  1. Stop accepting new connections (`server.close`).
 *  2. Wait for in-flight requests to finish, up to SHUTDOWN_TIMEOUT_MS.
 *  3. Close the Prisma connection.
 *  4. Exit 0.
 *
 * If anything hangs past the timeout, force-exit with code 1 — orchestrators
 * see the failure and can move on.
 */
export function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutdown_initiated');

    const forceExit = setTimeout(() => {
      logger.error({ signal }, 'shutdown_timeout_forced_exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close((err) => {
      if (err) logger.error({ err }, 'server_close_error');
      // allSettled keeps the per-close error logging below; Redis close
      // disabled (single-server deploy) — re-add closeRedis() here to restore.
      Promise.allSettled([closePrisma()])
        .then((results) => {
          for (const result of results) {
            if (result.status === 'rejected') {
              logger.error({ err: result.reason }, 'shutdown_cleanup_failed');
            }
          }
          logger.info('shutdown_complete');
          process.exit(0);
        })
        .catch((cleanupErr: unknown) => {
          logger.error({ err: cleanupErr }, 'shutdown_cleanup_failed');
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught_exception');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'unhandled_rejection');
    shutdown('unhandledRejection');
  });
}
