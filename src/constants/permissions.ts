/**
 * The permission catalog as a typed, compile-time-checked source of truth.
 *
 * Every authorization gate (`requirePermission`) and every DIMS permission
 * claim references these constants, so a typo or rename is caught by `tsc`
 * instead of failing closed (403) at runtime.
 *
 * The database (`DIMSAdminPermissions`, seeded in
 * `src/db/migrations/001_init.sql`) still owns *row existence* and role
 * assignments; this file owns the *key strings* the code checks against. The
 * two must stay in sync — never rename a key here without a migration that
 * also rewrites the seed and every `RolePermission` join row.
 */
export const PERMISSIONS = {
  // ─── Admin Users  (app/admin/users) ───────────────────────────────────────
  UsersView: 'Users.View',
  UsersInvite: 'Users.Invite', // future — no UI yet
  UsersEdit: 'Users.Edit',
  UsersAssignRoles: 'Users.AssignRoles',

  // ─── Admin RBAC Roles  (app/admin/roles) ──────────────────────────────────
  RolesView: 'Roles.View',
  RolesManage: 'Roles.Manage',

  // ─── Permission catalog  (role editor) ────────────────────────────────────
  PermissionsView: 'Permissions.View',

  // ─── Reports (no frontend page yet) ───────────────────────────────────────
  ReportsView: 'Reports.View',
  ReportsExport: 'Reports.Export',

  // ─── Audit log (no frontend page yet) ─────────────────────────────────────
  AuditView: 'Audit.View',

  // ─── Treatment Courts  (app/manage-treatment-courts [+ map-judges]) ───────
  TreatmentCourtsView: 'TreatmentCourts.View',
  TreatmentCourtsCreate: 'TreatmentCourts.Create',
  TreatmentCourtsEdit: 'TreatmentCourts.Edit',
  TreatmentCourtsDelete: 'TreatmentCourts.Delete',
  TreatmentCourtsMapJudges: 'TreatmentCourts.MapJudges',

  // ─── Treatment Court Users  (manage / replicate / transfer-coordinator) ───
  TreatmentCourtUsersView: 'TreatmentCourtUsers.View',
  TreatmentCourtUsersCreate: 'TreatmentCourtUsers.Create',
  TreatmentCourtUsersEdit: 'TreatmentCourtUsers.Edit',
  TreatmentCourtUsersDelete: 'TreatmentCourtUsers.Delete',
  TreatmentCourtUsersReplicate: 'TreatmentCourtUsers.Replicate',
  TreatmentCourtUsersTransfer: 'TreatmentCourtUsers.Transfer',

  // ─── PPSD Programs  (app/manage-ppsd-programs) ────────────────────────────
  PpsdProgramsView: 'PpsdPrograms.View',
  PpsdProgramsCreate: 'PpsdPrograms.Create',
  PpsdProgramsEdit: 'PpsdPrograms.Edit',
  PpsdProgramsDelete: 'PpsdPrograms.Delete',

  // ─── Labs  (app/manage-labs) ──────────────────────────────────────────────
  LabsView: 'Labs.View',
  LabsCreate: 'Labs.Create',
  LabsEdit: 'Labs.Edit',
  LabsDelete: 'Labs.Delete',

  // ─── LCMS Confirmation Labs  (app/manage-lcms-confirmation [+ /:id]) ──────
  LcmsLabsView: 'LcmsLabs.View',
  LcmsLabsCreate: 'LcmsLabs.Create',
  LcmsLabsEdit: 'LcmsLabs.Edit', // billing/shipping/contacts/assays/panels/pricing tabs

  // ─── STEPS Entities  (app/manage-steps-entity) ───────────────────────────
  StepsEntitiesView: 'StepsEntities.View',
  StepsEntitiesCreate: 'StepsEntities.Create',
  StepsEntitiesEdit: 'StepsEntities.Edit',
  StepsEntitiesDelete: 'StepsEntities.Delete',

  // ─── STEPS Users  (app/manage-steps-users) ───────────────────────────────
  StepsUsersView: 'StepsUsers.View',
  StepsUsersCreate: 'StepsUsers.Create',
  StepsUsersEdit: 'StepsUsers.Edit',
  StepsUsersDelete: 'StepsUsers.Delete',

  // ─── Lab Review / Sure App Users  (app/add-user-for-lab-review) ───────────
  LabReviewUsersView: 'LabReviewUsers.View',
  LabReviewUsersCreate: 'LabReviewUsers.Create',
  LabReviewUsersEdit: 'LabReviewUsers.Edit',

  // ─── Agency / Provider  (app/manage-agency-provider) ──────────────────────
  AgencyProvidersView: 'AgencyProviders.View',
  AgencyProvidersCreate: 'AgencyProviders.Create',
  AgencyProvidersEdit: 'AgencyProviders.Edit',
  AgencyProvidersDelete: 'AgencyProviders.Delete',

  // ─── Court Roles  (app/manage-roles — DIMS court-side roles, NOT admin RBAC)
  CourtRolesView: 'CourtRoles.View',
  CourtRolesCreate: 'CourtRoles.Create',
  CourtRolesEdit: 'CourtRoles.Edit',

  // ─── Analytics: Pooled Users  (app/analytics-pooled-users) ────────────────
  AnalyticsPooledUsersView: 'AnalyticsPooledUsers.View',
  AnalyticsPooledUsersCreate: 'AnalyticsPooledUsers.Create',
  AnalyticsPooledUsersEdit: 'AnalyticsPooledUsers.Edit',
  AnalyticsPooledUsersDelete: 'AnalyticsPooledUsers.Delete',

  // ─── Analytics: Sessions  (app/analytics-sessions — read-only) ────────────
  AnalyticsSessionsView: 'AnalyticsSessions.View',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All catalog keys as a flat, readonly array (useful for validation/tests). */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = Object.values(PERMISSIONS);
