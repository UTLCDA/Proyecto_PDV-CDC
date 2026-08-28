# Script de Configuración de Usuario SQL Server wpcadminaam
$user = "wpcadminaam"
$pass = "Aaron2804#"
$servers = @('localhost', '127.0.0.1', '.\SQLEXPRESS', '(local)', 'AAM')

Write-Host "=========================================================================="
Write-Host " CONFIGURANDO USUARIO Y AUTENTICACION EN SQL SERVER: $user"
Write-Host "=========================================================================="

$workingServer = $null

foreach ($s in $servers) {
    Write-Host "Probando servidor: $s ..."
    # 1. Probar si ya funciona la autenticación por usuario SQL
    try {
        $connStrSql = "Server=$s;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=3;"
        $connSql = New-Object System.Data.SqlClient.SqlConnection($connStrSql)
        $connSql.Open()
        Write-Host "SUCCESS: Autenticacion SQL ya esta activa para $user en $s!" -ForegroundColor Green
        $connSql.Close()
        $workingServer = $s
        break
    } catch {
        # 2. Intentar configurar usando Autenticación de Windows
        try {
            $connStrWin = "Server=$s;Database=master;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=3;"
            $connWin = New-Object System.Data.SqlClient.SqlConnection($connStrWin)
            $connWin.Open()
            Write-Host "INFO: Conectado a $s con Autenticacion de Windows. Habilitando Modo Mixto y creando login $user..." -ForegroundColor Yellow

            # Habilitar Modo Mixto (Windows + SQL Server Auth)
            try {
                $cmdReg = $connWin.CreateCommand()
                $cmdReg.CommandText = "EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2;"
                $cmdReg.ExecuteNonQuery() | Out-Null
            } catch { }

            # Crear/Actualizar Login wpcadminaam
            $tsqlLogin = @"
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'$user')
BEGIN
    CREATE LOGIN [$user] WITH PASSWORD=N'$pass', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
END
ELSE
BEGIN
    ALTER LOGIN [$user] WITH PASSWORD=N'$pass', CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF;
END;
ALTER SERVER ROLE [sysadmin] ADD MEMBER [$user];
ALTER LOGIN [$user] ENABLE;
"@
            $cmdLogin = $connWin.CreateCommand()
            $cmdLogin.CommandText = $tsqlLogin
            $cmdLogin.ExecuteNonQuery() | Out-Null
            $connWin.Close()

            # Reiniciar servicio SQL Server brevemente si se cambio la clave de registro, o probar conexion SQL directa
            Start-Sleep -Seconds 1

            $connSql = New-Object System.Data.SqlClient.SqlConnection($connStrSql)
            $connSql.Open()
            Write-Host "SUCCESS: Usuario $user verificado y conectado exitosamente en $s!" -ForegroundColor Green
            $connSql.Close()
            $workingServer = $s
            break
        } catch {
            Write-Host "INFO: $s -> $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
}

if ($workingServer) {
    Write-Host ""
    Write-Host "--------------------------------------------------------------------------"
    Write-Host "SERVIDOR SQL SERVER ACTIVO: $workingServer"
    Write-Host "--------------------------------------------------------------------------"

    # Actualizar appsettings.json
    $officialConnStr = "Server=$workingServer;Database=PosLambrinDb;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;"
    
    $appsettingsPath = "src\backend\Pos.Api\appsettings.json"
    $json = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
    $json.ConnectionStrings.DefaultConnection = $officialConnStr
    $json | ConvertTo-Json -Depth 10 | Set-Content $appsettingsPath -Encoding UTF8

    $devSettingsPath = "src\backend\Pos.Api\appsettings.Development.json"
    $jsonDev = Get-Content $devSettingsPath -Raw | ConvertFrom-Json
    $jsonDev.ConnectionStrings.DefaultConnection = $officialConnStr
    $jsonDev | ConvertTo-Json -Depth 10 | Set-Content $devSettingsPath -Encoding UTF8

    Write-Host "[1/3] Cadenas de conexion actualizadas en appsettings.json y appsettings.Development.json."

    # Ejecutar Migración EF Core
    Write-Host "[2/3] Creando base de datos limpia 'PosLambrinDb' mediante EF Core (dotnet ef database update)..."
    $env:DOTNET_ROOT = "C:\Users\wpcba\tools\dotnet"
    $env:PATH = "C:\Users\wpcba\.dotnet\tools;C:\Users\wpcba\tools\dotnet;" + $env:PATH
    & dotnet ef database update --project src/backend/Pos.Infrastructure --startup-project src/backend/Pos.Api

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Base de datos PosLambrinDb creada y migrada en SQL Server!" -ForegroundColor Green
    } else {
        Write-Host "ERROR al migrar base de datos." -ForegroundColor Red
        exit 1
    }

    # Probar consulta a PosLambrinDb con wpcadminaam
    Write-Host "[3/3] Validando acceso a PosLambrinDb con $user..."
    try {
        $dbConnStr = "Server=$workingServer;Database=PosLambrinDb;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=5;"
        $dbConn = New-Object System.Data.SqlClient.SqlConnection($dbConnStr)
        $dbConn.Open()
        $cmd = $dbConn.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) FROM sys.tables"
        $count = $cmd.ExecuteScalar()
        Write-Host "==========================================================================" -ForegroundColor Green
        Write-Host " BASE DE DATOS Y CONEXION DE SQL SERVER VERIFICADA Y LISTA PARA SSMS 20" -ForegroundColor Green
        Write-Host "==========================================================================" -ForegroundColor Green
        Write-Host " Servidor:     $workingServer"
        Write-Host " Autenticacion: SQL Server Authentication"
        Write-Host " Login:        $user"
        Write-Host " Password:     $pass"
        Write-Host " Base de datos: PosLambrinDb ($count tablas)"
        $dbConn.Close()
    } catch {
        Write-Host "ERROR al consultar PosLambrinDb: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No se pudo conectar a ninguna instancia local. Asegurate de que el servicio de SQL Server este iniciado." -ForegroundColor Red
}
