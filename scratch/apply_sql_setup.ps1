# Script de Verificación y Configuración de SQL Server para WPC Bajío
$env:DOTNET_ROOT = "C:\Users\wpcba\tools\dotnet"
$env:PATH = "C:\Users\wpcba\.dotnet\tools;C:\Users\wpcba\tools\dotnet;" + $env:PATH

$user = "wpcadminaam"
$pass = "Aaron2804#"
$servers = @('localhost', '127.0.0.1', '.\SQLEXPRESS', '(local)', 'AAM')
$workingServer = $null

Write-Host "=========================================================================="
Write-Host "   CONFIGURACION DE BASE DE DATOS Y USUARIO SQL SERVER: wpcadminaam"
Write-Host "=========================================================================="

foreach ($s in $servers) {
    try {
        $connStr = "Server=$s;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=3;"
        $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
        $conn.Open()
        Write-Host "SUCCESS: Conexion exitosa a SQL Server ($s) con usuario $user."
        $conn.Close()
        $workingServer = $s
        break
    } catch {
        try {
            $winConnStr = "Server=$s;Database=master;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=3;"
            $winConn = New-Object System.Data.SqlClient.SqlConnection($winConnStr)
            $winConn.Open()
            Write-Host "INFO: Instancia $s encontrada mediante Autenticacion de Windows. Creando usuario $user..."
            $cmdText = Get-Content -Path "scratch\setup_login.sql" -Raw
            $cmd = $winConn.CreateCommand()
            $cmd.CommandText = $cmdText.Replace("GO", "")
            $cmd.ExecuteNonQuery() | Out-Null
            $winConn.Close()
            
            $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
            $conn.Open()
            Write-Host "SUCCESS: Usuario $user creado y verificado exitosamente en $s."
            $conn.Close()
            $workingServer = $s
            break
        } catch {
            Write-Host "FAILED $s"
        }
    }
}

if (-not $workingServer) {
    Write-Host "ESTADO: Esperando a que el servicio de SQL Server termine de instalarse."
    exit 1
}

$finalConnStr = "Server=$workingServer;Database=PosLambrinDb;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
Write-Host "[1/3] Cadena de conexion oficial:"
Write-Host $finalConnStr

Write-Host "[2/3] Ejecutando migraciones de EF Core (dotnet ef database update)..."
& dotnet ef database update --project src/backend/Pos.Infrastructure --startup-project src/backend/Pos.Api

if ($LASTEXITCODE -eq 0) {
    Write-Host "Base de datos PosLambrinDb creada y migrada al 100% exitosamente."
} else {
    Write-Host "Error al aplicar migraciones en SQL Server."
    exit 1
}

Write-Host "[3/3] Validando acceso final a PosLambrinDb desde SQL Server Management Studio (SSMS 20)..."
try {
    $dbConnStr = "Server=$workingServer;Database=PosLambrinDb;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=5;"
    $dbConn = New-Object System.Data.SqlClient.SqlConnection($dbConnStr)
    $dbConn.Open()
    $cmd = $dbConn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM sys.tables"
    $tableCount = $cmd.ExecuteScalar()
    Write-Host "VERIFICADO: PosLambrinDb contiene $tableCount tablas creadas."
    Write-Host "CONEXION LISTA PARA SSMS 20:"
    Write-Host "Servidor: $workingServer"
    Write-Host "Autenticacion: SQL Server Authentication"
    Write-Host "Login: $user"
    Write-Host "Password: $pass"
    Write-Host "Base Datos: PosLambrinDb"
    $dbConn.Close()
} catch {
    Write-Host "Error en validacion de PosLambrinDb"
    exit 1
}
