import { env, isProduction } from './env.js';

export const authConfig = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    hostedDomain: env.GOOGLE_HOSTED_DOMAIN,
  },
  session: {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_COOKIE_NAME,
    ttlSeconds: env.SESSION_COOKIE_TTL_HOURS * 60 * 60,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: env.SESSION_COOKIE_TTL_HOURS * 60 * 60 * 1000,
    },
  },
} as const;
