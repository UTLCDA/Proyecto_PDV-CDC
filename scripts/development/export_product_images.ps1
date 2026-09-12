param(
    [string]$Server = "localhost",
    [string]$Database = "PosLambrinDb",
    [string]$User = "wpcadminaam",
    [string]$Password = "Aaron2804#",
    [string]$OutputDir = "D:\Visozr Etiquetas\public\product-images"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$connStr = "Server=$Server;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)

try {
    $conn.Open()
    Write-Host "[OK] Conectado a $Server [$Database]" -ForegroundColor Green

    $sql = "SELECT IdProducto, Sku, ImagenUrl FROM Products WHERE EstaActivo = 1 AND ImagenUrl IS NOT NULL AND LEN(ImagenUrl) > 50;"
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $reader = $cmd.ExecuteReader()

    $exportedCount = 0
    while ($reader.Read()) {
        $sku = ($reader["Sku"] + "").Trim()
        $imgUrl = ($reader["ImagenUrl"] + "").Trim()
        
        # Limpiar SKU para nombre de archivo (reemplazar guiones raros o caracteres especiales)
        $cleanSku = $sku -replace "[^a-zA-Z0-9_-]", "_"
        
        if ($imgUrl.StartsWith("data:image/")) {
            # Extraer base64
            $commaIdx = $imgUrl.IndexOf(",")
            if ($commaIdx -gt 0) {
                $base64 = $imgUrl.Substring($commaIdx + 1)
                $ext = "jpg"
                if ($imgUrl.StartsWith("data:image/png")) { $ext = "png" }
                elseif ($imgUrl.StartsWith("data:image/webp")) { $ext = "webp" }

                $filePath = Join-Path $OutputDir "$cleanSku.$ext"
                try {
                    $bytes = [System.Convert]::FromBase64String($base64)
                    [System.IO.File]::WriteAllBytes($filePath, $bytes)
                    $exportedCount++
                    Write-Host "  -> Guardado: $cleanSku.$ext ($([math]::Round($bytes.Length/1024, 1)) KB)" -ForegroundColor Gray
                } catch {
                    Write-Warning "No se pudo decodificar Base64 para SKU $sku : $_"
                }
            }
        }
    }
    $reader.Close()

    Write-Host "[EXITO] Total de imagenes exportadas a $OutputDir : $exportedCount" -ForegroundColor Green
}
finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) { $conn.Close() }
}
