# Script de Despliegue Directo de Esquema SQL Server para WPC Bajío
$server = "."
$user = "wpcadminaam"
$pass = "Aaron2804#"
$dbName = "PosLambrinDb"

Write-Host "=========================================================================="
Write-Host " CREANDO BASE DE DATOS Y TABLAS EN SQL SERVER: $dbName"
Write-Host "=========================================================================="

# 1. Crear base de datos PosLambrinDb limpia en SQL Server
$csMaster = "Server=$server;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
try {
    $connMaster = New-Object System.Data.SqlClient.SqlConnection($csMaster)
    $connMaster.Open()
    $cmd = $connMaster.CreateCommand()
    $cmd.CommandText = "IF EXISTS (SELECT name FROM sys.databases WHERE name = '$dbName') BEGIN ALTER DATABASE [$dbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$dbName]; END; CREATE DATABASE [$dbName];"
    $cmd.ExecuteNonQuery() | Out-Null
    $connMaster.Close()
    Write-Host "[1/4] Base de datos '$dbName' creada limpia en SQL Server." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se pudo crear la base de datos: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Ejecutar DDL clean_init.sql lote por lote (dividido por GO)
Write-Host "[2/4] Creando las 26 tablas en PosLambrinDb (clean_init.sql)..." -ForegroundColor Yellow
$csDb = "Server=$server;Database=$dbName;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
try {
    $connDb = New-Object System.Data.SqlClient.SqlConnection($csDb)
    $connDb.Open()

    $sqlContent = Get-Content -Path "scratch\clean_init.sql" -Raw
    $batches = $sqlContent -split "(?i)\r?\nGO\r?\n"

    foreach ($batch in $batches) {
        $trimmed = $batch.Trim()
        if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
            $cmdBatch = $connDb.CreateCommand()
            $cmdBatch.CommandText = $trimmed
            $cmdBatch.ExecuteNonQuery() | Out-Null
        }
    }
    $connDb.Close()
    Write-Host "[OK] Todas las tablas e índices creados exitosamente." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error al crear tablas en SQL Server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Registrar semillas de datos iniciales en la base de datos
Write-Host "[3/4] Poblando semillas de datos iniciales (Usuarios, Roles y Permisos)..." -ForegroundColor Yellow
$env:DOTNET_ROOT = "C:\Users\wpcba\tools\dotnet"
$env:PATH = "C:\Users\wpcba\tools\dotnet;" + $env:PATH

$p = Start-Process -FilePath "C:\Users\wpcba\tools\dotnet\dotnet.exe" -ArgumentList "run --project src/backend/Pos.Api" -PassThru -NoNewWindow
Start-Sleep -Seconds 7
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue

# 4. Validar conexión y contar tablas y usuarios
Write-Host "[4/4] Validando acceso final a PosLambrinDb desde SQL Server Management Studio 20..." -ForegroundColor Yellow
try {
    $connDb = New-Object System.Data.SqlClient.SqlConnection($csDb)
    $connDb.Open()
    
    $cmdDb = $connDb.CreateCommand()
    $cmdDb.CommandText = "SELECT COUNT(*) FROM sys.tables"
    $count = $cmdDb.ExecuteScalar()

    $cmdUsers = $connDb.CreateCommand()
    $cmdUsers.CommandText = "SELECT COUNT(*) FROM Users"
    $userCount = $cmdUsers.ExecuteScalar()

    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Green
    Write-Host " ¡BASE DE DATOS Y ESQUEMA CREADO AL 100% EN SQL SERVER!" -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Green
    Write-Host " Parametros de Conexion para SQL Server Management Studio 20 (SSMS):"
    Write-Host "   - Server name:     $server  (o localhost)"
    Write-Host "   - Authentication:  SQL Server Authentication"
    Write-Host "   - Login:           $user"
    Write-Host "   - Password:        $pass"
    Write-Host "   - Database:        $dbName"
    Write-Host "   - Tablas Creadas:  $count tablas"
    Write-Host "   - Usuarios Seed:   $userCount usuarios de inicio ('admin')"
    $connDb.Close()
} catch {
    Write-Host "[ERROR] Error al consultar la base de datos: $($_.Exception.Message)" -ForegroundColor Red
}
