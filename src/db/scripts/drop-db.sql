-- =============================================================
-- DIMS Admin Portal — drop the DIMSAdmin database for a fresh start.
-- Run from the `master` database context.
-- WARNING: this permanently deletes all data.
-- =============================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'DIMSAdminLocal')
BEGIN
    -- Kick all active connections before dropping.
    ALTER DATABASE [DIMSAdmin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [DIMSAdmin];
END
GO
