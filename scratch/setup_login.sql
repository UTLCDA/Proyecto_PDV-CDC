USE [master];
GO
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'wpcadminaam')
BEGIN
    CREATE LOGIN [wpcadminaam] WITH PASSWORD=N'Aaron2804#', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
    ALTER SERVER ROLE [sysadmin] ADD MEMBER [wpcadminaam];
    ALTER SERVER ROLE [dbcreator] ADD MEMBER [wpcadminaam];
END
ELSE
BEGIN
    ALTER LOGIN [wpcadminaam] WITH PASSWORD=N'Aaron2804#', CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
    ALTER SERVER ROLE [sysadmin] ADD MEMBER [wpcadminaam];
END;
GO
