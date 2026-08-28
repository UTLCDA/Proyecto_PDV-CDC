$user = "wpcadminaam"
$pass = "Aaron2804#"

$targets = @("localhost", "127.0.0.1", ".", "(local)", "np:\\.\pipe\sql\query")

foreach ($t in $targets) {
    try {
        $cs = "Server=$t;Database=master;User Id=$user;Password=$pass;TrustServerCertificate=True;Encrypt=False;Connection Timeout=3;"
        $conn = New-Object System.Data.SqlClient.SqlConnection($cs)
        $conn.Open()
        Write-Host "OK: $t" -ForegroundColor Green
        $conn.Close()
    } catch {
        Write-Host "FAIL $t : $($_.Exception.Message)" -ForegroundColor Red
    }
}
