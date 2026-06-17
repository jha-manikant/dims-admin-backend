-- =============================================================
-- DIMS Admin Portal — initial schema (MS SQL Server)
-- Single-organization, RS256 service JWT, Google hd-restricted
-- =============================================================

-- -------------------------------------------------------------
-- 0. Create the database if it does not already exist.
--    Run this script from the `master` database context.
-- -------------------------------------------------------------
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'DIMSAdmin')
BEGIN
    CREATE DATABASE [DIMSAdmin];
END
GO

USE [DIMSAdmin];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- -------------------------------------------------------------
-- 1. DIMSAdminUsers
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminUsers (
    Id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_DIMSAdminUsers PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    GoogleId         NVARCHAR(255)    NOT NULL,
    Email            NVARCHAR(320)    NOT NULL,
    DIMSUserId       NVARCHAR(255)    NULL,
    FirstName        NVARCHAR(100)    NULL,
    LastName         NVARCHAR(100)    NULL,
    ProfileImageUrl  NVARCHAR(2048)   NULL,
    IsActive         BIT              NOT NULL CONSTRAINT DF_DIMSAdminUsers_IsActive  DEFAULT 1,
    LastLoginAt      DATETIME2(3)     NULL,
    CreatedAt        DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminUsers_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminUsers_UpdatedAt DEFAULT SYSUTCDATETIME(),
    DeletedAt        DATETIME2(3)     NULL
);
GO

CREATE UNIQUE INDEX UX_DIMSAdminUsers_GoogleId_Active
    ON DIMSAdminUsers (GoogleId) WHERE DeletedAt IS NULL;
CREATE UNIQUE INDEX UX_DIMSAdminUsers_Email_Active
    ON DIMSAdminUsers (Email)    WHERE DeletedAt IS NULL;
CREATE UNIQUE INDEX UX_DIMSAdminUsers_DIMSUserId_Active
    ON DIMSAdminUsers (DIMSUserId) WHERE DeletedAt IS NULL AND DIMSUserId IS NOT NULL;
GO

-- -------------------------------------------------------------
-- 2. DIMSAdminRoles
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminRoles (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_DIMSAdminRoles PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name          NVARCHAR(100)    NOT NULL,
    Description   NVARCHAR(500)    NULL,
    IsSystemRole  BIT              NOT NULL CONSTRAINT DF_DIMSAdminRoles_IsSystemRole DEFAULT 0,
    IsActive      BIT              NOT NULL CONSTRAINT DF_DIMSAdminRoles_IsActive     DEFAULT 1,
    CreatedAt     DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminRoles_CreatedAt    DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminRoles_UpdatedAt    DEFAULT SYSUTCDATETIME(),
    DeletedAt     DATETIME2(3)     NULL
);
GO
CREATE UNIQUE INDEX UX_DIMSAdminRoles_Name_Active
    ON DIMSAdminRoles (Name) WHERE DeletedAt IS NULL;
GO

-- -------------------------------------------------------------
-- 3. DIMSAdminPermissions
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminPermissions (
    Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_DIMSAdminPermissions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PermissionKey  NVARCHAR(255)    NOT NULL,
    Category       NVARCHAR(100)    NULL,
    Description    NVARCHAR(500)    NULL,
    IsActive       BIT              NOT NULL CONSTRAINT DF_DIMSAdminPermissions_IsActive  DEFAULT 1,
    CreatedAt      DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminPermissions_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminPermissions_UpdatedAt DEFAULT SYSUTCDATETIME(),
    DeletedAt      DATETIME2(3)     NULL
);
GO
CREATE UNIQUE INDEX UX_DIMSAdminPermissions_Key_Active
    ON DIMSAdminPermissions (PermissionKey) WHERE DeletedAt IS NULL;
GO

-- -------------------------------------------------------------
-- 4. DIMSAdminRolePermissions   (M:N — role <-> permission)
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminRolePermissions (
    RoleId       UNIQUEIDENTIFIER NOT NULL,
    PermissionId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt    DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminRolePermissions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DIMSAdminRolePermissions PRIMARY KEY (RoleId, PermissionId),
    CONSTRAINT FK_DIMSAdminRolePermissions_Role
        FOREIGN KEY (RoleId)       REFERENCES DIMSAdminRoles(Id),
    CONSTRAINT FK_DIMSAdminRolePermissions_Permission
        FOREIGN KEY (PermissionId) REFERENCES DIMSAdminPermissions(Id)
);
GO
CREATE INDEX IX_DIMSAdminRolePermissions_PermissionId
    ON DIMSAdminRolePermissions (PermissionId);
GO

-- -------------------------------------------------------------
-- 5. DIMSAdminUserRoles   (M:N — user <-> role, current state only)
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminUserRoles (
    UserId      UNIQUEIDENTIFIER NOT NULL,
    RoleId      UNIQUEIDENTIFIER NOT NULL,
    AssignedAt  DATETIME2(3)     NOT NULL CONSTRAINT DF_DIMSAdminUserRoles_AssignedAt DEFAULT SYSUTCDATETIME(),
    AssignedBy  UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_DIMSAdminUserRoles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_DIMSAdminUserRoles_User
        FOREIGN KEY (UserId)     REFERENCES DIMSAdminUsers(Id),
    CONSTRAINT FK_DIMSAdminUserRoles_Role
        FOREIGN KEY (RoleId)     REFERENCES DIMSAdminRoles(Id),
    CONSTRAINT FK_DIMSAdminUserRoles_AssignedBy
        FOREIGN KEY (AssignedBy) REFERENCES DIMSAdminUsers(Id)
);
GO
CREATE INDEX IX_DIMSAdminUserRoles_RoleId
    ON DIMSAdminUserRoles (RoleId);
GO

-- -------------------------------------------------------------
-- 6. DIMSAdminAuditLogs
-- -------------------------------------------------------------
CREATE TABLE DIMSAdminAuditLogs (
    Id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DIMSAdminAuditLogs PRIMARY KEY,
    RequestId   NVARCHAR(64)         NULL,
    UserId      UNIQUEIDENTIFIER     NULL,
    Action      NVARCHAR(255)        NOT NULL,
    EntityType  NVARCHAR(255)        NULL,
    EntityId    NVARCHAR(255)        NULL,
    OldValues   NVARCHAR(MAX)        NULL,
    NewValues   NVARCHAR(MAX)        NULL,
    IpAddress   NVARCHAR(45)         NULL,
    UserAgent   NVARCHAR(1024)       NULL,
    Success     BIT                  NOT NULL CONSTRAINT DF_DIMSAdminAuditLogs_Success   DEFAULT 1,
    CreatedAt   DATETIME2(3)         NOT NULL CONSTRAINT DF_DIMSAdminAuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_DIMSAdminAuditLogs_User
        FOREIGN KEY (UserId) REFERENCES DIMSAdminUsers(Id)
);
GO
CREATE INDEX IX_DIMSAdminAuditLogs_UserId_CreatedAt
    ON DIMSAdminAuditLogs (UserId, CreatedAt DESC);
CREATE INDEX IX_DIMSAdminAuditLogs_CreatedAt
    ON DIMSAdminAuditLogs (CreatedAt DESC);
CREATE INDEX IX_DIMSAdminAuditLogs_RequestId
    ON DIMSAdminAuditLogs (RequestId) WHERE RequestId IS NOT NULL;
GO

-- -------------------------------------------------------------
-- 6b. DIMSAdminSessions   (express-session store, via Prisma)
--     Replaces the former Redis-backed session store. Guarded so it is safe
--     to apply to a database that already has it.
-- -------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'DIMSAdminSessions')
BEGIN
    CREATE TABLE DIMSAdminSessions (
        Sid       NVARCHAR(128) NOT NULL CONSTRAINT PK_DIMSAdminSessions PRIMARY KEY,
        Data      NVARCHAR(MAX) NOT NULL,
        ExpiresAt DATETIME2(3)  NOT NULL
    );

    CREATE INDEX IX_DIMSAdminSessions_ExpiresAt ON DIMSAdminSessions (ExpiresAt);
END
GO

-- -------------------------------------------------------------
-- 7. Seed: built-in permissions
-- -------------------------------------------------------------
INSERT INTO DIMSAdminPermissions (PermissionKey, Category, Description, IsActive) VALUES
    ('Users.View',        'Users',    'View admin users',                     1),
    ('Users.Invite',      'Users',    'Invite new admin users (future)',      1),
    ('Users.Edit',        'Users',    'Edit admin user profile fields',       1),
    ('Users.AssignRoles', 'Users',    'Grant or revoke roles on users',       1),
    ('Roles.View',        'Roles',    'View roles and their permissions',     1),
    ('Roles.Manage',      'Roles',    'Create / edit / delete non-system roles', 1),
    ('Reports.View',      'Reports',  'View reports',                         1),
    ('Reports.Export',    'Reports',  'Export reports',                       1),
    ('Audit.View',        'Audit',    'View audit log entries',               1),
    ('Permissions.View',  'Permissions', 'View the permission catalog',       1),
    -- Treatment Courts
    ('TreatmentCourts.View',      'TreatmentCourts', 'View treatment courts',            1),
    ('TreatmentCourts.Create',    'TreatmentCourts', 'Create treatment courts',          1),
    ('TreatmentCourts.Edit',      'TreatmentCourts', 'Edit treatment courts',            1),
    ('TreatmentCourts.Delete',    'TreatmentCourts', 'Delete treatment courts',          1),
    ('TreatmentCourts.MapJudges', 'TreatmentCourts', 'Map judges to treatment courts',   1),
    -- Treatment Court Users
    ('TreatmentCourtUsers.View',      'TreatmentCourtUsers', 'View treatment court users',          1),
    ('TreatmentCourtUsers.Create',    'TreatmentCourtUsers', 'Create treatment court users',        1),
    ('TreatmentCourtUsers.Edit',      'TreatmentCourtUsers', 'Edit treatment court users',          1),
    ('TreatmentCourtUsers.Delete',    'TreatmentCourtUsers', 'Delete treatment court users',        1),
    ('TreatmentCourtUsers.Replicate', 'TreatmentCourtUsers', 'Replicate treatment court users',     1),
    ('TreatmentCourtUsers.Transfer',  'TreatmentCourtUsers', 'Transfer treatment court coordinator', 1),
    -- PPSD Programs
    ('PpsdPrograms.View',   'PpsdPrograms', 'View PPSD programs',   1),
    ('PpsdPrograms.Create', 'PpsdPrograms', 'Create PPSD programs', 1),
    ('PpsdPrograms.Edit',   'PpsdPrograms', 'Edit PPSD programs',   1),
    ('PpsdPrograms.Delete', 'PpsdPrograms', 'Delete PPSD programs', 1),
    -- Labs
    ('Labs.View',   'Labs', 'View labs',   1),
    ('Labs.Create', 'Labs', 'Create labs', 1),
    ('Labs.Edit',   'Labs', 'Edit labs',   1),
    ('Labs.Delete', 'Labs', 'Delete labs', 1),
    -- LCMS Confirmation Labs
    ('LcmsLabs.View',   'LcmsLabs', 'View LCMS confirmation labs',   1),
    ('LcmsLabs.Create', 'LcmsLabs', 'Create LCMS confirmation labs', 1),
    ('LcmsLabs.Edit',   'LcmsLabs', 'Edit LCMS confirmation labs',   1),
    -- STEPS Entities
    ('StepsEntities.View',   'StepsEntities', 'View STEPS entities',   1),
    ('StepsEntities.Create', 'StepsEntities', 'Create STEPS entities', 1),
    ('StepsEntities.Edit',   'StepsEntities', 'Edit STEPS entities',   1),
    ('StepsEntities.Delete', 'StepsEntities', 'Delete STEPS entities', 1),
    -- STEPS Users
    ('StepsUsers.View',   'StepsUsers', 'View STEPS users',   1),
    ('StepsUsers.Create', 'StepsUsers', 'Create STEPS users', 1),
    ('StepsUsers.Edit',   'StepsUsers', 'Edit STEPS users',   1),
    ('StepsUsers.Delete', 'StepsUsers', 'Delete STEPS users', 1),
    -- Lab Review / Sure App Users
    ('LabReviewUsers.View',   'LabReviewUsers', 'View lab review users',   1),
    ('LabReviewUsers.Create', 'LabReviewUsers', 'Create lab review users', 1),
    ('LabReviewUsers.Edit',   'LabReviewUsers', 'Edit lab review users',   1),
    -- Agency / Provider
    ('AgencyProviders.View',   'AgencyProviders', 'View agencies / providers',   1),
    ('AgencyProviders.Create', 'AgencyProviders', 'Create agencies / providers', 1),
    ('AgencyProviders.Edit',   'AgencyProviders', 'Edit agencies / providers',   1),
    ('AgencyProviders.Delete', 'AgencyProviders', 'Delete agencies / providers', 1),
    -- Court Roles (DIMS court-side roles, not admin RBAC)
    ('CourtRoles.View',   'CourtRoles', 'View court roles',   1),
    ('CourtRoles.Create', 'CourtRoles', 'Create court roles', 1),
    ('CourtRoles.Edit',   'CourtRoles', 'Edit court roles',   1),
    -- Analytics: Pooled Users
    ('AnalyticsPooledUsers.View',   'AnalyticsPooledUsers', 'View analytics pooled users',   1),
    ('AnalyticsPooledUsers.Create', 'AnalyticsPooledUsers', 'Create analytics pooled users', 1),
    ('AnalyticsPooledUsers.Edit',   'AnalyticsPooledUsers', 'Edit analytics pooled users',   1),
    ('AnalyticsPooledUsers.Delete', 'AnalyticsPooledUsers', 'Delete analytics pooled users', 1),
    -- Analytics: Sessions (read-only)
    ('AnalyticsSessions.View', 'AnalyticsSessions', 'View analytics sessions', 1);
GO

-- -------------------------------------------------------------
-- 8. Seed: built-in roles
-- -------------------------------------------------------------
-- Only SuperAdmin is seeded. All other roles are created at runtime via the
-- role editor and composed from the permission catalog above.
INSERT INTO DIMSAdminRoles (Name, Description, IsSystemRole, IsActive) VALUES
    ('SuperAdmin', 'Full access to all features and user/role management', 1, 1);
GO

-- -------------------------------------------------------------
-- 9. Seed: default role <-> permission mappings
-- -------------------------------------------------------------
-- SuperAdmin holds every active permission.
INSERT INTO DIMSAdminRolePermissions (RoleId, PermissionId)
SELECT r.Id, p.Id
FROM DIMSAdminRoles r
CROSS JOIN DIMSAdminPermissions p
WHERE r.Name = 'SuperAdmin' AND p.IsActive = 1;
GO
