$srcConnStr = "Server=193.46.198.88;Database=PosLambrinDb;User Id=wpcadminaam;Password=Aaron2804#;TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($srcConnStr)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT COUNT(*) FROM ProductImages"
$cntImages = $cmd.ExecuteScalar()
Write-Host "ProductImages count in PR: $cntImages"

$cmd.CommandText = "SELECT COUNT(*) FROM Products WHERE LEN(ISNULL(ImagenUrl, '')) > 0"
$cntProductsWithUrl = $cmd.ExecuteScalar()
Write-Host "Products with ImagenUrl in PR: $cntProductsWithUrl"

$cmd.CommandText = "SELECT TOP 10 Sku, Nombre, LEFT(ImagenUrl, 60) as Img FROM Products WHERE LEN(ISNULL(ImagenUrl, '')) > 0"
$r = $cmd.ExecuteReader()
while ($r.Read()) {
    Write-Host "$($r['Sku']) -> $($r['Img'])"
}
$r.Close()

$cmd.CommandText = "SELECT TOP 10 Id, ProductId, Url, EsPrincipal FROM ProductImages"
$r2 = $cmd.ExecuteReader()
while ($r2.Read()) {
    Write-Host "Img: $($r2['ProductId']) | $($r2['Url']) | Principal: $($r2['EsPrincipal'])"
}
$r2.Close()

$conn.Close()
