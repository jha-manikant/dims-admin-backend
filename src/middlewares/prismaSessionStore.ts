import { Store, type SessionData } from 'express-session';
import { authConfig } from '../configs/auth.js';
import { getPrisma } from '../db/prisma.js';

/**
 * express-session Store backed by the SQL Server database via Prisma. Replaces
 * the former Redis-backed (`connect-redis`) store for the single-server
 * deployment — sessions persist across restarts with no extra infrastructure
 * and no third-party store dependency.
 *
 * Rows live in `DIMSAdminSessions` (Prisma model `DIMSAdminSession`), keyed by
 * the session id. Expired rows are pruned lazily on read; `touch` slides the
 * expiry on each request so `rolling: true` sessions behave as before.
 */
export class PrismaSessionStore extends Store {
  private readonly prisma = getPrisma();

  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    void this.prisma.dIMSAdminSession
      .findUnique({ where: { sid } })
      .then((row) => {
        if (!row) {
          callback(null, null);
          return;
        }
        if (row.expiresAt.getTime() <= Date.now()) {
          void this.prisma.dIMSAdminSession.deleteMany({ where: { sid } });
          callback(null, null);
          return;
        }
        let data: SessionData;
        try {
          data = JSON.parse(row.data) as SessionData;
        } catch {
          // Corrupt row — treat as no session rather than erroring the request.
          callback(null, null);
          return;
        }
        callback(null, data);
      })
      .catch((err: unknown) => {
        callback(err);
      });
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = this.getExpiry(session);
    const data = JSON.stringify(session);
    void this.prisma.dIMSAdminSession
      .upsert({
        where: { sid },
        create: { sid, data, expiresAt },
        update: { data, expiresAt },
      })
      .then(() => {
        callback?.();
      })
      .catch((err: unknown) => {
        callback?.(err);
      });
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    // deleteMany (not delete) so destroying an already-gone session is a no-op.
    void this.prisma.dIMSAdminSession
      .deleteMany({ where: { sid } })
      .then(() => {
        callback?.();
      })
      .catch((err: unknown) => {
        callback?.(err);
      });
  }

  touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = this.getExpiry(session);
    void this.prisma.dIMSAdminSession
      .updateMany({ where: { sid }, data: { expiresAt } })
      .then(() => {
        callback?.();
      })
      .catch((err: unknown) => {
        callback?.(err);
      });
  }

  /**
   * Absolute expiry for a session row, derived from the cookie's `maxAge`
   * (reset to the full TTL each request, so `rolling` sessions slide). Falls
   * back to the configured TTL if a cookie has no maxAge.
   */
  private getExpiry(session: SessionData): Date {
    const maxAgeMs = session.cookie.maxAge ?? authConfig.session.ttlSeconds * 1000;
    return new Date(Date.now() + maxAgeMs);
  }
}
