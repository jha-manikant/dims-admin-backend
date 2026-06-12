import { mintServiceJwt } from '../auth-tokens/serviceJwt.js';
import { dimsConfig } from '../configs/jwt.js';
import { UpstreamError } from '../errors/index.js';
import type { DimsCallOptions, DimsResponse } from '../types/dims.types.js';
import { logger } from '../utils/logger.js';

/**
 * Call the DIMS .NET API on behalf of an admin user.
 *
 * Responsibilities (best-practices rules #44, #45, #46, #47):
 *  - Mint a fresh, short-lived RS256 service JWT (one permission, 180s TTL).
 *  - Attach `Authorization: Bearer …` and `X-Request-Id` headers.
 *  - Enforce a hard timeout via AbortController.
 *  - Normalize DIMS responses to `UpstreamError` so callers never see raw
 *    vendor payloads.
 *  - No automatic retries in v1: callers (or the user from the UI) retry
 *    explicitly. We can add an `Idempotency-Key`-aware retry layer later.
 */
export async function callDims(opts: DimsCallOptions): Promise<DimsResponse> {
  const jwt = await mintServiceJwt({
    adminUserId: opts.user.id,
    email: opts.user.email,
    permission: opts.permission,
    requestId: opts.requestId,
  });

  const url = `${stripTrailing(dimsConfig.baseUrl)}${ensureLeading(opts.path)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, dimsConfig.timeoutMs);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    'X-Request-Id': opts.requestId,
    Accept: 'application/json',
    ...(opts.headers ?? {}),
  };
  const hasBody = opts.body !== undefined && opts.method !== 'GET';
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method,
      headers,
      signal: controller.signal,
      ...(hasBody ? { body: JSON.stringify(opts.body) } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw UpstreamError.dimsTimeout({ path: opts.path, timeoutMs: dimsConfig.timeoutMs });
    }
    logger.error({ err, path: opts.path }, 'dims_network_error');
    throw UpstreamError.dimsUnavailable({
      path: opts.path,
      cause: err instanceof Error ? err.message : 'unknown',
    });
  } finally {
    clearTimeout(timer);
  }

  const data = await parseBody(response);

  if (!response.ok) {
    throw normalizeDimsError(response.status, data, opts.path);
  }
  return { status: response.status, data };
}

/**
 * Translate a non-2xx response from the DIMS API into a normalized
 * `UpstreamError`. Best-practices rule #45: never leak the vendor's raw
 * response shape to our clients.
 *
 * The mapping is intentionally coarse — DIMS owns its own error model and we
 * don't try to perfectly mirror it. Anything 4xx that comes from DIMS but
 * passes our authz checks is treated as an upstream rejection (502); 5xx is
 * upstream failure; auth-related statuses get specific codes so we can spot
 * misconfiguration quickly.
 */
function normalizeDimsError(status: number, body: unknown, path: string): UpstreamError {
  if (status === 401) {
    return new UpstreamError({
      code: 'DIMS_UNAUTHORIZED',
      message: 'DIMS rejected the service token',
      statusCode: 502,
      upstream: 'dims',
      details: { path, dimsStatus: status, dimsBody: safeBody(body) },
    });
  }
  if (status === 403) {
    return new UpstreamError({
      code: 'DIMS_FORBIDDEN',
      message: 'DIMS denied access for this permission',
      statusCode: 502,
      upstream: 'dims',
      details: { path, dimsStatus: status, dimsBody: safeBody(body) },
    });
  }
  if (status >= 500) {
    return new UpstreamError({
      code: 'DIMS_SERVER_ERROR',
      message: 'DIMS returned a server error',
      statusCode: 502,
      upstream: 'dims',
      details: { path, dimsStatus: status, dimsBody: safeBody(body) },
    });
  }
  return new UpstreamError({
    code: 'DIMS_BAD_REQUEST',
    message: 'DIMS rejected the request',
    statusCode: 502,
    upstream: 'dims',
    details: { path, dimsStatus: status, dimsBody: safeBody(body) },
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Truncate the upstream body so a verbose error doesn't blow up our logs / response. */
function safeBody(body: unknown): unknown {
  if (body === null || body === undefined) return null;
  const serialized = typeof body === 'string' ? body : JSON.stringify(body);
  if (serialized.length <= 2_000) {
    return body;
  }
  return serialized.slice(0, 2_000) + '…';
}

function stripTrailing(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function ensureLeading(s: string): string {
  return s.startsWith('/') ? s : `/${s}`;
}
