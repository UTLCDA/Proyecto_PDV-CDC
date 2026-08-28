$cs = "Server=.;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($cs)
$conn.Open()

$sql = Get-Content -Path "scratch\fix_cajero_role.sql" -Raw
$batches = $sql -split "(?i)\r?\nGO\r?\n"

foreach ($b in $batches) {
    $trimmed = $b.Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $trimmed
        $cmd.ExecuteNonQuery() | Out-Null
    }
}

$cmdCheck = $conn.CreateCommand()
$cmdCheck.CommandText = "SELECT Id, Nombre, Descripcion, EstaActivo FROM Roles WHERE EstaActivo = 1"
$r = $cmdCheck.ExecuteReader()
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " ROLES ACTIVOS EN BASE DE DATOS SQL SERVER (PosLambrinDb):" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
while ($r.Read()) {
    Write-Host "  - Rol ID: $($r[0]) | Nombre: $($r[1]) | Descripcion: $($r[2])" -ForegroundColor White
}
$conn.Close()
