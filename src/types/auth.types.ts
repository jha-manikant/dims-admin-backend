/**
 * Public projection of an admin user — safe to return to the frontend.
 * Never include googleId or DB internals like deletedAt / timestamps from
 * raw rows; build this shape explicitly in repositories / services.
 */
export interface AdminUserPublic {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

/**
 * Claims we trust from a verified Google ID token. Verification happens in
 * `services/auth.services.ts`; consumers downstream rely on these being present.
 */
export interface VerifiedGoogleClaims {
  sub: string;
  email: string;
  emailVerified: true;
  hostedDomain: string;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
}
