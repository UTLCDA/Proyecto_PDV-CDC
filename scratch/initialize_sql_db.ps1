# Script de Inicialización y Creación de Tablas en PosLambrinDb
$server = "."
$user = "wpcadminaam"
$pass = "Aaron2804#"
$dbName = "PosLambrinDb"

Write-Host "=========================================================================="
Write-Host " INICIALIZANDO BASE DE DATOS FÍSICA '$dbName' EN SQL SERVER"
Write-Host "=========================================================================="

$csMaster = "Server=$server;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
try {
    $connMaster = New-Object System.Data.SqlClient.SqlConnection($csMaster)
    $connMaster.Open()
    $cmd = $connMaster.CreateCommand()
    $cmd.CommandText = "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '$dbName') BEGIN CREATE DATABASE [$dbName]; END;"
    $cmd.ExecuteNonQuery() | Out-Null
    $connMaster.Close()
    Write-Host "[1/3] Base de datos '$dbName' verificada/creada en SQL Server." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se pudo conectar a SQL Server master: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Ejecutar script T-SQL de creación de tablas o EnsureCreated mediante EF Core
$csDb = "Server=$server;Database=$dbName;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"

# Ejecutar el Host de la API en segundo plano brevemente para inicializar y poblar esquema y semillas
Write-Host "[2/3] Creando tablas e insertando datos de semilla (DbInitializer)..." -ForegroundColor Yellow
$env:DOTNET_ROOT = "C:\Users\wpcba\tools\dotnet"
$env:PATH = "C:\Users\wpcba\tools\dotnet;" + $env:PATH

# Ejecutar dotnet run en background y esperar a que responda en http://localhost:5000
$p = Start-Process -FilePath "C:\Users\wpcba\tools\dotnet\dotnet.exe" -ArgumentList "run --project src/backend/Pos.Api" -PassThru -NoNewWindow

Start-Sleep -Seconds 8

# Detener el proceso temporal
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue

# 3. Validar Tablas y Permisos para SSMS 20
Write-Host "[3/3] Validando acceso a '$dbName' desde SQL Server Management Studio 20 (SSMS)..." -ForegroundColor Yellow
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
    Write-Host "  ¡BASE DE DATOS Y TABLAS CREADAS AL 100% EN SQL SERVER!" -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Green
    Write-Host " Parametros de Conexion para SSMS 20 (SQL Server Management Studio):"
    Write-Host "   - Server name:     $server  (o localhost)"
    Write-Host "   - Authentication:  SQL Server Authentication"
    Write-Host "   - Login:           $user"
    Write-Host "   - Password:        $pass"
    Write-Host "   - Database:        $dbName"
    Write-Host "   - Tablas Creadas:  $count tablas"
    Write-Host "   - Usuarios Seed:   $userCount usuarios activos"
    $connDb.Close()
} catch {
    Write-Host "[ERROR] Error al consultar tablas en PosLambrinDb: $($_.Exception.Message)" -ForegroundColor Red
}
