import { Router, type Request, type Response } from 'express';
import { getKeystore } from '../auth-tokens/keystore.js';
import { jwtConfig } from '../configs/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Public discovery + JWKS endpoints. The DIMS .NET API points its
 * `JwtBearerOptions.MetadataAddress` at `/.well-known/openid-configuration`,
 * which directs it to `/.well-known/jwks.json` for the verification key(s).
 *
 * Both routes are unauthenticated by design — JWKs are public.
 */
export const jwksRouter = Router();

jwksRouter.get(
  '/.well-known/jwks.json',
  asyncHandler(async (_req: Request, res: Response) => {
    const { publicJwk } = await getKeystore();
    // Cache: short — gives us fast rotation while still avoiding hammering on hot paths.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ keys: [publicJwk] });
  }),
);

jwksRouter.get('/.well-known/openid-configuration', (_req, res) => {
  // Minimal discovery doc — only what JwtBearer in .NET reads.
  // Note: this is NOT a full OIDC provider; we only expose enough for token
  // verification consumers to find the JWKS.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    issuer: jwtConfig.issuer,
    jwks_uri: `${jwtConfig.issuer.replace(/\/$/, '')}/.well-known/jwks.json`,
    id_token_signing_alg_values_supported: [jwtConfig.algorithm],
    response_types_supported: ['none'],
    subject_types_supported: ['public'],
  });
});
