import { env } from './env.js';

export const dbConfig = {
  url: env.DATABASE_URL,
  connectTimeoutMs: 5_000,
} as const;
