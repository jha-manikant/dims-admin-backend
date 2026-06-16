import { getKeystore } from './auth-tokens/keystore.js';
import { createApp } from './app.js';
import { appConfig } from './configs/app.js';
import { env } from './configs/env.js';
import { registerShutdownHandlers } from './health/shutdown.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  // Load the signing keys before accepting traffic so a missing file or an
  // unreachable / misconfigured Secrets Manager fails the boot instead of the
  // first DIMS call. The result is cached for the process lifetime.
  await getKeystore();

  const app = createApp();

  const server = app.listen(appConfig.port, () => {
    logger.info(
      {
        port: appConfig.port,
        env: env.NODE_ENV,
        apiBasePath: appConfig.apiBasePath,
      },
      'server_started',
    );
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  registerShutdownHandlers(server);
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'server_bootstrap_failed');
  process.exit(1);
});
