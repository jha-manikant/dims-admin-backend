import { env } from './env.js';

export const appConfig = {
  port: env.PORT,
  corsOrigins: env.CORS_ORIGINS,
  apiBasePath: '/api/v1',
  features: env.FEATURES,
} as const;
