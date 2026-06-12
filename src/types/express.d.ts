/**
 * Express.Request augmentation. Loaded ambient via `tsconfig`.
 */
import type { Logger } from 'pino';

declare module 'express-serve-static-core' {
  interface Request {
    /** Per-request UUID. Set by requestId middleware; echoed as X-Request-Id. */
    requestId: string;
    /** Pino child logger bound to this request's context. Provided by pino-http. */
    log: Logger;
    /** Authenticated admin user. Set by authenticate middleware. */
    user?: AuthenticatedUser;
    /** Permission keys for this user. Set by loadPermissions middleware. */
    permissions?: ReadonlySet<string>;
  }
}

declare global {
  interface AuthenticatedUser {
    id: string;
    googleId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
  }
}

export {};
