-- =============================================================
-- Migration 001 — DIMSAdminSessions (express-session store via Prisma)
-- =============================================================
-- Replaces the former Redis-backed session store for the single-server
-- deployment. Apply to an existing database with:
--   npm run db:migrate:raw -- 001_sessions.sql
-- (Fresh databases get this table from src/db/scripts/init-db.sql.)
-- Guarded with IF NOT EXISTS so it is safe to re-run.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

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
