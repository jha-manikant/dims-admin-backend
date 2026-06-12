import type { Request } from 'express';

/**
 * Type-narrowing assertion: after this returns, `req.user` and
 * `req.permissions` are non-null in the caller's scope.
 *
 * Use in any route that sits behind `authenticate` + `loadPermissions`.
 * The middleware chain guarantees both, but TypeScript can't infer that from
 * route-level annotations; this assertion bridges the gap without sprinkling
 * `!` operators (which our ESLint config forbids).
 */
export function assertAuthed(req: Request): asserts req is Request & {
  user: NonNullable<Request['user']>;
  permissions: NonNullable<Request['permissions']>;
} {
  if (!req.user || !req.permissions) {
    // This is a programmer error: a route is mounted without the proper
    // middleware chain. Fail loudly.
    throw new Error('Route is missing authenticate + loadPermissions middleware');
  }
}
