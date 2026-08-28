$servers = @('localhost', '127.0.0.1', '.\SQLEXPRESS', '(local)', 'AAM', '(localdb)\MSSQLLocalDB')
foreach ($s in $servers) {
    try {
        $connStr = "Server=$s;Database=master;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=3;"
        $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
        $conn.Open()
        Write-Host "SUCCESS: Connected to SQL Server instance: $s" -ForegroundColor Green
        $conn.Close()
    } catch {
        Write-Host "FAILED $s : $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
