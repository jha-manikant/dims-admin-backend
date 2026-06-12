import { Router } from 'express';
import { handleGoogleCallback, handleLogout } from '../controllers/auth.controllers.js';
import { authRateLimit } from '../middlewares/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

// Both routes are unauthenticated by definition (sign-in establishes the
// session; logout works without one too). They are heavily rate-limited so
// brute-force attempts against the Google verifier are bounded.
authRouter.use(authRateLimit);

authRouter.post('/google/callback', asyncHandler(handleGoogleCallback));
authRouter.post('/logout', asyncHandler(handleLogout));
