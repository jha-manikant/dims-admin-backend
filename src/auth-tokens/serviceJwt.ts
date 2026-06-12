import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { jwtConfig } from '../configs/jwt.js';
import { getKeystore } from './keystore.js';

/**
 * Mint a short-lived RS256 JWT for one outbound call to the DIMS API.
 *
 * Design choices (see `doc/project.md` § Cross-System Authorization):
 * - Expiry = `SERVICE_JWT_TTL_SECONDS` (default 180s / 3 min). Long enough to
 *   absorb slow networks and retries; short enough that a leaked token is
 *   useless within minutes.
 * - `permissions` claim carries ONLY the single permission the current call
 *   needs (least privilege). Never the user's full permission set.
 * - `kid` header lets DIMS pick the right verification key during rotation.
 * - `rid` claim mirrors `X-Request-Id` so DIMS audit logs and ours align.
 */
export interface MintServiceJwtInput {
  adminUserId: string;
  email: string;
  permission: string;
  requestId: string;
}

export async function mintServiceJwt(input: MintServiceJwtInput): Promise<string> {
  const { signingKey, kid, algorithm } = await getKeystore();
  return new SignJWT({
    email: input.email,
    permissions: [input.permission],
    rid: input.requestId,
  })
    .setProtectedHeader({ alg: algorithm, kid, typ: 'JWT' })
    .setIssuer(jwtConfig.issuer)
    .setAudience(jwtConfig.audience)
    .setSubject(input.adminUserId)
    .setIssuedAt()
    .setExpirationTime(`${String(jwtConfig.ttlSeconds)}s`)
    .setJti(randomUUID())
    .sign(signingKey);
}
