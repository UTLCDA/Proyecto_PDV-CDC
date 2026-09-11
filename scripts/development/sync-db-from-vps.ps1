# ==============================================================================
# Script de sincronización de Base de Datos Producción (VPS) a Local (DEV)
# WPC Bajío - Sistema Punto de Venta (PDV)
# ==============================================================================
param(
    [string]$VpsHost = "193.46.198.88",
    [string]$VpsUser = "root",
    [string]$TargetDb = "PosLambrinDb",
    [switch]$AlsoRestoreDevCopy = $true
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Resolve-Path "$PSScriptRoot\..\.."
$BackupDir = Join-Path $WorkspaceRoot "backups"
$LocalBakPath = Join-Path $BackupDir "PosLambrinDb_Prod.bak"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

Write-Host "`n>>> [1/4] Generando respaldo en VPS ($VpsHost)..." -ForegroundColor Cyan
$remoteScript = @'
if [ -x /usr/local/bin/backup-pos-db.sh ]; then
    /usr/local/bin/backup-pos-db.sh
else
    cat << 'EOF' > /tmp/backup_vps.sql
BACKUP DATABASE PosLambrinDb TO DISK = '/var/opt/mssql/data/PosLambrinDb_Prod.bak' WITH FORMAT, INIT;
GO
EOF
    docker cp /tmp/backup_vps.sql mssql-server:/tmp/backup_vps.sql
    docker exec mssql-server /opt/mssql-tools18/bin/sqlcmd -S localhost -U wpcadminaam -P 'Aaron2804#' -C -i /tmp/backup_vps.sql
    docker cp mssql-server:/var/opt/mssql/data/PosLambrinDb_Prod.bak /tmp/PosLambrinDb_Prod.bak
fi
'@

ssh -o StrictHostKeyChecking=no "$VpsUser@$VpsHost" $remoteScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error generando respaldo en el VPS."
    exit 1
}

Write-Host "`n>>> [2/4] Descargando respaldo a local ($LocalBakPath)..." -ForegroundColor Cyan
scp -o StrictHostKeyChecking=no "$VpsUser@${VpsHost}:/tmp/PosLambrinDb_Prod.bak" $LocalBakPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error descargando archivo .bak por SCP."
    exit 1
}

Write-Host "`n>>> [3/4] Restaurando base de datos '$TargetDb' en SQL Server local..." -ForegroundColor Cyan
$sqlDataDir = "C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA"
$targetMdf = Join-Path $sqlDataDir "$TargetDb.mdf"
$targetLdf = Join-Path $sqlDataDir "$($TargetDb)_log.ldf"

$restoreSql = @"
ALTER DATABASE [$TargetDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [$TargetDb] FROM DISK = N'$LocalBakPath'
WITH MOVE N'PosLambrinDb' TO N'$targetMdf',
     MOVE N'PosLambrinDb_log' TO N'$targetLdf',
     REPLACE;
ALTER DATABASE [$TargetDb] SET MULTI_USER;
"@

sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -Q $restoreSql
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error restaurando base de datos principal local."
    exit 1
}

if ($AlsoRestoreDevCopy) {
    Write-Host "`n>>> [3.1] Restaurando copia secundaria 'PosLambrinDb_Dev'..." -ForegroundColor Cyan
    $devMdf = Join-Path $sqlDataDir "PosLambrinDb_Dev.mdf"
    $devLdf = Join-Path $sqlDataDir "PosLambrinDb_Dev_log.ldf"
    
    $devSql = @"
IF DB_ID('PosLambrinDb_Dev') IS NOT NULL
BEGIN
    ALTER DATABASE [PosLambrinDb_Dev] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END;
RESTORE DATABASE [PosLambrinDb_Dev] FROM DISK = N'$LocalBakPath'
WITH MOVE N'PosLambrinDb' TO N'$devMdf',
     MOVE N'PosLambrinDb_log' TO N'$devLdf',
     REPLACE;
ALTER DATABASE [PosLambrinDb_Dev] SET MULTI_USER;
"@
    sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -Q $devSql
}

Write-Host "`n>>> [4/4] Verificando conteo de registros en '$TargetDb'..." -ForegroundColor Green
$verifySql = "SELECT t.name AS TableName, i.rows AS RowCounts FROM sys.tables t INNER JOIN sys.sysindexes i ON t.object_id = i.id WHERE i.indid < 2 AND i.rows > 0 ORDER BY RowCounts DESC;"
sqlcmd -S localhost -U wpcadminaam -P "Aaron2804#" -d $TargetDb -Q $verifySql

Write-Host "`n=== Sincronización completada exitosamente. ===" -ForegroundColor Green
