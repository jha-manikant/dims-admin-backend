import { env } from './env.js';

export const jwtConfig = {
  issuer: env.SERVICE_JWT_ISSUER,
  audience: env.SERVICE_JWT_AUDIENCE,
  ttlSeconds: env.SERVICE_JWT_TTL_SECONDS,
  privateKeyPath: env.SERVICE_JWT_PRIVATE_KEY_PATH,
  publicKeyPath: env.SERVICE_JWT_PUBLIC_KEY_PATH,
  keyId: env.SERVICE_JWT_KEY_ID,
  algorithm: 'RS256' as const,
} as const;

export const dimsConfig = {
  baseUrl: env.DIMS_API_BASE_URL,
  timeoutMs: env.DIMS_API_TIMEOUT_MS,
} as const;
