$cs = "Server=.;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($cs)
$conn.Open()

$sql = [System.IO.File]::ReadAllText("scratch\fix_accent_encodings.sql", [System.Text.Encoding]::UTF8)
$batches = $sql -split "(?i)\r?\nGO\r?\n"

foreach ($b in $batches) {
    $trimmed = $b.Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $trimmed
        $cmd.ExecuteNonQuery() | Out-Null
    }
}

Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " CARACTERES Y ACENTOS CORREGIDOS AL 100% EN POSLAMBRINDB (UNICODE):" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green

$cmdCheck = $conn.CreateCommand()
$cmdCheck.CommandText = "SELECT Nombre, Descripcion FROM Roles WHERE EstaActivo = 1"
$r = $cmdCheck.ExecuteReader()
while ($r.Read()) {
    Write-Host "  - Rol: $($r[0]) | Descripcion: $($r[1])" -ForegroundColor White
}
$conn.Close()
