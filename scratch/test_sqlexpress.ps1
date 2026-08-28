$servers = @('.\SQLEXPRESS', 'localhost\SQLEXPRESS', 'localhost', '127.0.0.1', '(local)')
$user = "wpcadminaam"
$pass = "Aaron2804#"

foreach ($s in $servers) {
    # 1. Probar SQL Auth
    try {
        $connStr = "Server=$s;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=3;"
        $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
        $conn.Open()
        Write-Host "SQL_AUTH_SUCCESS: $s" -ForegroundColor Green
        $conn.Close()
    } catch {
        # 2. Probar Windows Auth
        try {
            $winStr = "Server=$s;Database=master;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=3;"
            $winConn = New-Object System.Data.SqlClient.SqlConnection($winStr)
            $winConn.Open()
            Write-Host "WIN_AUTH_SUCCESS: $s" -ForegroundColor Yellow
            $winConn.Close()
        } catch {
            Write-Host "FAILED: $s -> $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
}
