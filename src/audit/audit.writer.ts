import type { Prisma, PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { getPrisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export interface AuditEntry {
  requestId: string;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Append a row to `DIMSAdminAuditLogs`. Pass a transaction client when the
 * audit row must commit/abort together with a domain mutation (e.g. role
 * grant). Otherwise omit `tx` to use the default client.
 *
 * Audit log writes never throw to the caller — a logging failure must not
 * mask the real operation. Errors are logged at error level instead.
 */
export async function writeAudit(entry: AuditEntry, tx?: PrismaLike): Promise<void> {
  const client = tx ?? getPrisma();
  try {
    await client.dIMSAdminAuditLog.create({
      data: {
        requestId: entry.requestId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        success: entry.success ?? true,
      },
    });
  } catch (err) {
    logger.error({ err, entry }, 'audit_write_failed');
  }
}

/**
 * Convenience: build a partial `AuditEntry` pre-filled from the request.
 * Callers spread the result and add the action-specific fields.
 */
export function auditContext(
  req: Request,
): Pick<AuditEntry, 'requestId' | 'userId' | 'ipAddress' | 'userAgent'> {
  return {
    requestId: req.requestId,
    userId: req.user?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
  };
}
