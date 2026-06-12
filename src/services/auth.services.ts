import type { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { auditContext, writeAudit } from '../audit/audit.writer.js';
import { authConfig } from '../configs/auth.js';
import { UnauthorizedError } from '../errors/index.js';
import { upsertUserOnGoogleSignIn } from '../repositories/auth.repositories.js';
import type { AdminUserPublic, VerifiedGoogleClaims } from '../types/auth.types.js';

const oauthClient = new OAuth2Client(authConfig.google.clientId);

/**
 * Verifies the Google ID token's signature against Google's JWKS (handled by
 * the library), then enforces our domain-specific rules:
 *
 *  1. `email_verified` MUST be true. An unverified Google account is one a
 *     hostile party could be sitting on.
 *  2. `hd` MUST equal our configured hosted-domain. This is the gate that
 *     restricts who can sign in — only members of the Workspace org.
 *
 * Returns a normalized claims shape with the fields downstream code needs.
 * Throws `UnauthorizedError` on any failure (caller surfaces 401).
 */
async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleClaims> {
  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: authConfig.google.clientId,
    });
  } catch {
    throw new UnauthorizedError('Invalid Google ID token');
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new UnauthorizedError('Invalid Google ID token');
  }

  if (payload.email_verified !== true) {
    throw new UnauthorizedError('Google account email is not verified');
  }
  if (payload.hd !== authConfig.google.hostedDomain) {
    throw new UnauthorizedError('Account is not part of the allowed organization', {
      code: 'HD_MISMATCH',
    });
  }
  if (!payload.sub || !payload.email) {
    throw new UnauthorizedError('Google ID token is missing required claims');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    hostedDomain: payload.hd,
    firstName: payload.given_name ?? null,
    lastName: payload.family_name ?? null,
    picture: payload.picture ?? null,
  };
}

/**
 * Sign-in workflow:
 *  1. Verify the Google ID token (signature, hd, email_verified).
 *  2. Upsert the admin user record.
 *  3. Reject if the user is soft-deleted or deactivated (no role grant
 *     can rescue a disabled user).
 *  4. Set the session cookie via the caller (controller does the side effect
 *     on `req.session`).
 *  5. Audit the sign-in.
 *
 * Returns the safe public projection of the user.
 */
export async function signInWithGoogle(req: Request, idToken: string): Promise<AdminUserPublic> {
  const claims = await verifyGoogleIdToken(idToken);
  const user = await upsertUserOnGoogleSignIn(claims);

  if (!user.isActive) {
    await writeAudit({
      ...auditContext(req),
      userId: user.id,
      action: 'Auth.SignInRejected',
      newValues: { reason: 'user_inactive' },
      success: false,
    });
    throw new UnauthorizedError('Your account is deactivated', { code: 'ACCOUNT_INACTIVE' });
  }

  req.session.adminUserId = user.id;

  await writeAudit({
    ...auditContext(req),
    userId: user.id,
    action: 'Auth.SignedIn',
  });

  return user;
}

/**
 * Destroy the session. Safe to call even if no session exists.
 */
export async function signOut(req: Request): Promise<void> {
  const userId = req.session.adminUserId ?? null;
  await writeAudit({
    ...auditContext(req),
    userId,
    action: 'Auth.SignedOut',
  });
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    });
  });
}
