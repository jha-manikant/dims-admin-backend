import { env } from './env.js';

export const jwtConfig = {
  issuer: env.SERVICE_JWT_ISSUER,
  audience: env.SERVICE_JWT_AUDIENCE,
  ttlSeconds: env.SERVICE_JWT_TTL_SECONDS,
  keyId: env.SERVICE_JWT_KEY_ID,
  algorithm: 'RS256' as const,
  // Key source + its inputs (see configs/env.ts). Exactly one set is populated,
  // enforced by the env superRefine.
  keySource: env.SERVICE_JWT_KEY_SOURCE,
  privateKeyPath: env.SERVICE_JWT_PRIVATE_KEY_PATH,
  publicKeyPath: env.SERVICE_JWT_PUBLIC_KEY_PATH,
  keysSecretId: env.SERVICE_JWT_KEYS_SECRET_ID,
  awsRegion: env.AWS_REGION,
} as const;

export const dimsConfig = {
  baseUrl: env.DIMS_API_BASE_URL,
  timeoutMs: env.DIMS_API_TIMEOUT_MS,
} as const;
