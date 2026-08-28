$user = "wpcadminaam"
$pass = "Aaron2804#"
$server = "."

Write-Host "=========================================================================="
Write-Host "  CREACION LIMPIA DE BASE DE DATOS 'PosLambrinDb' EN SQL SERVER"
Write-Host "=========================================================================="

# 1. Eliminar PosLambrinDb previa incompleta si existe
try {
    $csMaster = "Server=$server;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
    $conn = New-Object System.Data.SqlClient.SqlConnection($csMaster)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "IF EXISTS (SELECT name FROM sys.databases WHERE name = 'PosLambrinDb') BEGIN ALTER DATABASE [PosLambrinDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [PosLambrinDb]; END;"
    $cmd.ExecuteNonQuery() | Out-Null
    $conn.Close()
    Write-Host "[1/3] Base de datos previa removida para instalacion 100% limpia." -ForegroundColor Green
} catch {
    Write-Host "Error al limpiar base de datos previa: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Ejecutar dotnet ef database update desde cero
Write-Host "[2/3] Aplicando migraciones de EF Core..." -ForegroundColor Yellow
$env:DOTNET_ROOT = "C:\Users\wpcba\tools\dotnet"
$env:PATH = "C:\Users\wpcba\.dotnet\tools;C:\Users\wpcba\tools\dotnet;" + $env:PATH
& dotnet ef database update --project src/backend/Pos.Infrastructure --startup-project src/backend/Pos.Api

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migraciones aplicadas al 100% exitosamente." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Fallo en migraciones de EF Core." -ForegroundColor Red
    exit 1
}

# 3. Validar PosLambrinDb y contar tablas creadas
Write-Host "[3/3] Validando PosLambrinDb con $user..." -ForegroundColor Yellow
try {
    $csDb = "Server=$server;Database=PosLambrinDb;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
    $connDb = New-Object System.Data.SqlClient.SqlConnection($csDb)
    $connDb.Open()
    $cmdDb = $connDb.CreateCommand()
    $cmdDb.CommandText = "SELECT COUNT(*) FROM sys.tables"
    $count = $cmdDb.ExecuteScalar()
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Green
    Write-Host "  ¡BASE DE DATOS LIMPIA Y CONEXION VERIFICADA AL 100%!" -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Green
    Write-Host " Datos de acceso para SQL Server Management Studio 20 (SSMS):"
    Write-Host "   - Server name:     $server"
    Write-Host "   - Authentication:  SQL Server Authentication"
    Write-Host "   - Login:           $user"
    Write-Host "   - Password:        $pass"
    Write-Host "   - Database:        PosLambrinDb"
    Write-Host "   - Tablas Creadas:  $count tablas"
    $connDb.Close()
} catch {
    Write-Host "Error en validacion final: $($_.Exception.Message)" -ForegroundColor Red
}
