import { exportJWK, importPKCS8, importSPKI, type JWK, type KeyLike } from 'jose';
import { readFile } from 'node:fs/promises';
import { jwtConfig } from '../configs/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Holds the RS256 keypair used to sign service JWTs (private) and the JWK
 * served from /.well-known/jwks.json (public).
 *
 * Loaded eagerly on first call; cached for the process lifetime. Key rotation
 * is handled by deploying a new pair under a new path + bumping
 * SERVICE_JWT_KEY_ID. v2 (multi-key) can extend this to publish multiple JWKs.
 */
export interface Keystore {
  signingKey: KeyLike;
  publicJwk: JWK;
  kid: string;
  algorithm: 'RS256';
}

let cached: Promise<Keystore> | null = null;

async function loadKeystore(): Promise<Keystore> {
  const [privateRaw, publicRaw] = await Promise.all([
    readFile(jwtConfig.privateKeyPath, 'utf-8'),
    readFile(jwtConfig.publicKeyPath, 'utf-8'),
  ]);

  const signingKey = await importPKCS8(privateRaw, jwtConfig.algorithm);
  const publicKey = await importSPKI(publicRaw, jwtConfig.algorithm);
  const publicJwk = await exportJWK(publicKey);

  // Decorate the JWK with the standard discovery fields.
  publicJwk.kid = jwtConfig.keyId;
  publicJwk.use = 'sig';
  publicJwk.alg = jwtConfig.algorithm;

  logger.info({ kid: jwtConfig.keyId }, 'keystore_loaded');
  return { signingKey, publicJwk, kid: jwtConfig.keyId, algorithm: jwtConfig.algorithm };
}

export function getKeystore(): Promise<Keystore> {
  cached ??= loadKeystore().catch((err: unknown) => {
    cached = null;
    throw err;
  });
  return cached;
}
