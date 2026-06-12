/**
 * Augments express-session's SessionData with the admin user id stored after
 * successful Google sign-in. Other identity data is loaded from DB on each
 * request — the session itself only carries the user id.
 */
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    adminUserId?: string;
  }
}

export {};
