import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
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
  const { privateRaw, publicRaw } = await readKeyMaterial();

  const signingKey = await importPKCS8(privateRaw, jwtConfig.algorithm);
  const publicKey = await importSPKI(publicRaw, jwtConfig.algorithm);
  const publicJwk = await exportJWK(publicKey);

  // Decorate the JWK with the standard discovery fields.
  publicJwk.kid = jwtConfig.keyId;
  publicJwk.use = 'sig';
  publicJwk.alg = jwtConfig.algorithm;

  logger.info({ kid: jwtConfig.keyId, source: jwtConfig.keySource }, 'keystore_loaded');
  return { signingKey, publicJwk, kid: jwtConfig.keyId, algorithm: jwtConfig.algorithm };
}

/**
 * Resolve the raw PEM strings from the configured source. `file` reads from
 * disk (dev); `aws` fetches a single JSON secret from Secrets Manager at boot.
 * Downstream (importPKCS8/importSPKI) is identical regardless of origin.
 */
async function readKeyMaterial(): Promise<{ privateRaw: string; publicRaw: string }> {
  if (jwtConfig.keySource === 'aws') {
    return fetchKeysFromSecretsManager();
  }
  // env validation guarantees both paths are present in `file` mode; guard
  // anyway to narrow the type without a non-null assertion.
  const { privateKeyPath, publicKeyPath } = jwtConfig;
  if (!privateKeyPath || !publicKeyPath) {
    throw new Error(
      'SERVICE_JWT_KEY_SOURCE=file requires SERVICE_JWT_PRIVATE_KEY_PATH and SERVICE_JWT_PUBLIC_KEY_PATH',
    );
  }
  const [privateRaw, publicRaw] = await Promise.all([
    readFile(privateKeyPath, 'utf-8'),
    readFile(publicKeyPath, 'utf-8'),
  ]);
  return { privateRaw, publicRaw };
}

async function fetchKeysFromSecretsManager(): Promise<{ privateRaw: string; publicRaw: string }> {
  const { keysSecretId, awsRegion } = jwtConfig;
  if (!keysSecretId) {
    throw new Error('SERVICE_JWT_KEY_SOURCE=aws requires SERVICE_JWT_KEYS_SECRET_ID');
  }
  // env validation guarantees awsRegion is set in `aws` mode; pass it only when
  // present so we don't trip exactOptionalPropertyTypes.
  const client = new SecretsManagerClient(awsRegion ? { region: awsRegion } : {});
  const res = await client.send(new GetSecretValueCommand({ SecretId: keysSecretId }));
  if (!res.SecretString) {
    throw new Error('jwt keys secret has no SecretString');
  }
  const parsed = JSON.parse(res.SecretString) as { privateKey?: string; publicKey?: string };
  if (!parsed.privateKey || !parsed.publicKey) {
    throw new Error('jwt keys secret must contain "privateKey" and "publicKey"');
  }
  return { privateRaw: normalizePem(parsed.privateKey), publicRaw: normalizePem(parsed.publicKey) };
}

/**
 * Some secret stores deliver PEMs with literal "\n" sequences instead of real
 * newlines; jose's importPKCS8/importSPKI require real newlines.
 */
function normalizePem(raw: string): string {
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export function getKeystore(): Promise<Keystore> {
  cached ??= loadKeystore().catch((err: unknown) => {
    cached = null;
    throw err;
  });
  return cached;
}
