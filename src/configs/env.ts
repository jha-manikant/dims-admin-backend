/**
 * Single source of truth for environment configuration.
 *
 * Boot fails fast (with a readable diff) if anything is missing or malformed.
 * Best-practices rule #6: nothing else in the codebase reads process.env.
 */
import { z } from 'zod';

const NodeEnv = z.enum(['development', 'test', 'staging', 'production']);

const LogLevel = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const csvList = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const intString = (defaultValue: number) =>
  z
    .string()
    .default(String(defaultValue))
    .transform((value, ctx) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be a non-negative integer' });
        return z.NEVER;
      }
      return parsed;
    });

const featuresSchema = z
  .string()
  .default('{}')
  .transform((value, ctx) => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FEATURES must be a JSON object' });
        return z.NEVER;
      }
      return parsed as Record<string, boolean>;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FEATURES must be valid JSON' });
      return z.NEVER;
    }
  });

const schema = z.object({
  NODE_ENV: NodeEnv.default('development'),
  PORT: intString(4000),
  LOG_LEVEL: LogLevel.default('info'),

  CORS_ORIGINS: csvList,

  DATABASE_URL: z.string().min(1),
  // Backs the session store, rate-limit counters, and the permission cache.
  REDIS_URL: z.string().url(),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_COOKIE_NAME: z.string().min(1).default('dims_admin_session'),
  SESSION_COOKIE_TTL_HOURS: intString(8),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_HOSTED_DOMAIN: z.string().min(1),

  SERVICE_JWT_ISSUER: z.string().url(),
  SERVICE_JWT_AUDIENCE: z.string().min(1),
  SERVICE_JWT_TTL_SECONDS: intString(180),
  SERVICE_JWT_PRIVATE_KEY_PATH: z.string().min(1),
  SERVICE_JWT_PUBLIC_KEY_PATH: z.string().min(1),
  SERVICE_JWT_KEY_ID: z.string().min(1),

  DIMS_API_BASE_URL: z.string().url(),
  DIMS_API_TIMEOUT_MS: intString(10_000),

  PERMISSION_CACHE_TTL_SECONDS: intString(300),

  FEATURES: featuresSchema,
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console -- intentional boot-time abort
    console.error(`\nInvalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
