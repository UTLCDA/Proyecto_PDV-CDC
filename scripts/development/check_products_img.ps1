$connStr = "Server=localhost;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Sku, Nombre, LEN(ISNULL(ImagenUrl, '')) as LenImg, LEFT(ISNULL(ImagenUrl, ''), 80) as SampleImg FROM Products WHERE Sku LIKE '%WPC-PA%' OR LEN(ISNULL(ImagenUrl, '')) > 0 ORDER BY Sku"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host "$($reader['Sku']) | $($reader['Nombre']) | Len: $($reader['LenImg']) | $($reader['SampleImg'])"
}
$reader.Close()
$conn.Close()
