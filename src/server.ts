import { createApp } from './app.js';
import { appConfig } from './configs/app.js';
import { env } from './configs/env.js';
import { registerShutdownHandlers } from './health/shutdown.js';
import { logger } from './utils/logger.js';

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
