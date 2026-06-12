import type { Request } from 'express';
import { auditContext, writeAudit } from '../audit/audit.writer.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { assertAuthed } from '../utils/assertAuthed.js';
import { callDims } from './dims.services.js';

/**
 * Thin service layer for the Labs DIMS module: every method is a "the RBAC
 * check already happened in the route, now call DIMS, then audit" wrapper.
 *
 * INVARIANT: the `permission` passed to `callDims` MUST equal the
 * `requirePermission(...)` key gating the corresponding route in
 * `labs.routes.ts`. The route gate (PDP) and the JWT claim (verified by DIMS,
 * the PEP) must reference the same permission.
 *
 * TODO(dims-spec): the `path` values below are placeholders following standard
 * REST conventions. Replace them with the real DIMS Labs endpoints once the
 * DIMS API spec is available, and keep `docs/dims-permission-map.md` in sync.
 */

export async function listLabs(req: Request): Promise<unknown> {
  assertAuthed(req);
  const result = await callDims({
    method: 'GET',
    path: '/labs', // TODO(dims-spec)
    user: { id: req.user.id, email: req.user.email },
    permission: PERMISSIONS.LabsView,
    requestId: req.requestId,
  });
  return result.data;
}

export async function createLab(
  req: Request,
  body: Record<string, unknown>,
): Promise<unknown> {
  assertAuthed(req);
  const result = await callDims({
    method: 'POST',
    path: '/labs', // TODO(dims-spec)
    user: { id: req.user.id, email: req.user.email },
    permission: PERMISSIONS.LabsCreate,
    requestId: req.requestId,
    body,
  });

  await writeAudit({
    ...auditContext(req),
    action: 'Labs.Created',
    entityType: 'Lab',
    newValues: { keys: Object.keys(body) },
  });

  return result.data;
}

export async function updateLab(
  req: Request,
  id: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  assertAuthed(req);
  const result = await callDims({
    method: 'PUT',
    path: `/labs/${id}`, // TODO(dims-spec)
    user: { id: req.user.id, email: req.user.email },
    permission: PERMISSIONS.LabsEdit,
    requestId: req.requestId,
    body,
  });

  await writeAudit({
    ...auditContext(req),
    action: 'Labs.Updated',
    entityType: 'Lab',
    entityId: id,
    newValues: { keys: Object.keys(body) },
  });

  return result.data;
}

export async function deleteLab(req: Request, id: string): Promise<unknown> {
  assertAuthed(req);
  const result = await callDims({
    method: 'DELETE',
    path: `/labs/${id}`, // TODO(dims-spec)
    user: { id: req.user.id, email: req.user.email },
    permission: PERMISSIONS.LabsDelete,
    requestId: req.requestId,
  });

  await writeAudit({
    ...auditContext(req),
    action: 'Labs.Deleted',
    entityType: 'Lab',
    entityId: id,
  });

  return result.data;
}
