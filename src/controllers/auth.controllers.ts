import type { Request, Response } from 'express';
import { authConfig } from '../configs/auth.js';
import { signInWithGoogle, signOut } from '../services/auth.services.js';
import { googleCallbackBody } from '../validationSchemas/auth.validationSchema.js';

/**
 * POST /auth/google/callback
 *   body: { idToken: string }
 *   200: { user: AdminUserPublic }
 *
 * The frontend (Auth.js on Next.js) obtains the ID token from Google and
 * POSTs it here. We verify it, hydrate the user, and set the session cookie.
 */
export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const { idToken } = googleCallbackBody.parse(req.body);
  const user = await signInWithGoogle(req, idToken);
  res.status(200).json({ user });
}

/**
 * POST /auth/logout
 *   200: { success: true }
 *
 * Destroys the server-side session and clears the cookie.
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  await signOut(req);
  res.clearCookie(authConfig.session.cookieName);
  res.status(200).json({ success: true });
}
