import type { PermissionKey } from '../constants/permissions.js';

export type DimsMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DimsCallOptions {
  method: DimsMethod;
  /** Path component (must start with `/`), appended to DIMS_API_BASE_URL. */
  path: string;
  /** Required: the permission this call needs. Embedded in the service JWT. */
  permission: PermissionKey;
  /** Required: identifies the calling admin (for `sub` claim + DIMS' audit). */
  user: { id: string; email: string };
  /** Required: from req.requestId (for `rid` claim + cross-system correlation). */
  requestId: string;
  /** JSON body for non-GET calls. */
  body?: unknown;
  /** Extra headers to forward. Don't include Authorization — the client sets it. */
  headers?: Record<string, string>;
}

export interface DimsResponse {
  status: number;
  data: unknown;
}
