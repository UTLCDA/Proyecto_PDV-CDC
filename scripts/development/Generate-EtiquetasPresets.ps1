param(
    [string]$Server = "localhost",
    [string]$Database = "PosLambrinDb",
    [string]$User = "wpcadminaam",
    [string]$Password = "Aaron2804#",
    [string]$OutputFile = "D:\Visozr Etiquetas\src\data\presets.ts"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Generando Presets de Etiquetas desde Base de Datos Local ===" -ForegroundColor Cyan

$connStr = "Server=$Server;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)

try {
    $conn.Open()
    Write-Host "[OK] Conectado a $Server [$Database]" -ForegroundColor Green

    $sql = @"
SELECT 
    p.IdProducto,
    p.Sku,
    p.Barcode,
    p.Nombre,
    p.Color,
    p.LargoCm,
    p.AnchoCm,
    p.AltoCm,
    p.PrecioUnitario,
    ISNULL(c.Nombre, 'WPC Interior') AS Categoria
FROM Products p
LEFT JOIN Categories c ON p.CategoriaId = c.Id
WHERE p.EstaActivo = 1
ORDER BY p.IdProducto;
"@

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $count = $adapter.Fill($dt)

    Write-Host "Total de productos activos encontrados: $count" -ForegroundColor Green

    # Función para deducir color visual para la bolita preview
    function Get-PreviewColor($text) {
        $t = ($text + "").ToLower()
        if ($t -match "blanco|mármol|marble|white") { return "#f1f0eb" }
        if ($t -match "negro|black|carbón") { return "#1f1e1d" }
        if ($t -match "gris|gray|grey|cenizo") { return "#7a7978" }
        if ($t -match "rojo|rojiz|anaranjad|terracota") { return "#9e4823" }
        if ($t -match "oro|dorado|gold") { return "#d4af37" }
        if ($t -match "nogal|dark|oscuro|wenge") { return "#4a2d18" }
        if ($t -match "teca|roble|marrón|brown") { return "#784c28" }
        if ($t -match "beige|crema|claro|natural|pino") { return "#d6b88d" }
        return "#8a5d3b" # Color madera estándar
    }

    $tsItems = @()
    foreach ($row in $dt.Rows) {
        $sku = ($row["Sku"] + "").Trim()
        $barcode = ($row["Barcode"] + "").Trim()
        $nombre = ($row["Nombre"] + "").Trim()
        $color = ($row["Color"] + "").Trim()
        if ([string]::IsNullOrWhiteSpace($color)) {
            $color = $nombre
        }

        $largo = 290
        if ($row["LargoCm"] -ne [DBNull]::Value -and $row["LargoCm"] -ne $null) {
            $largo = [decimal]$row["LargoCm"]
        }
        $ancho = 16
        if ($row["AnchoCm"] -ne [DBNull]::Value -and $row["AnchoCm"] -ne $null) {
            $ancho = [decimal]$row["AnchoCm"]
        }
        $alto = 2.2
        if ($row["AltoCm"] -ne [DBNull]::Value -and $row["AltoCm"] -ne $null) {
            $alto = [decimal]$row["AltoCm"]
        }
        if ($largo -le 0) { $largo = 290 }
        if ($ancho -le 0) { $ancho = 16 }
        if ($alto -le 0) { $alto = 2.2 }
        $largoStr = ([decimal]$largo).ToString("0.##")
        $anchoStr = ([decimal]$ancho).ToString("0.##")
        $altoStr = ([decimal]$alto).ToString("0.##")
        $dimensiones = "$largoStr cm × $anchoStr cm × $altoStr cm"

        $precio = 0
        if ($row["PrecioUnitario"] -ne [DBNull]::Value -and $row["PrecioUnitario"] -ne $null) {
            $precio = [double]$row["PrecioUnitario"]
        }
        $categoria = ($row["Categoria"] + "").Trim()
        $previewHex = Get-PreviewColor "$color $nombre"

        # Escapar comillas simples
        $colorEsc = $color.Replace("'", "\'")
        $dimEsc = $dimensiones.Replace("'", "\'")
        $skuEsc = $sku.Replace("'", "\'")
        $barEsc = $barcode.Replace("'", "\'")
        $catEsc = $categoria.Replace("'", "\'")

        $tsItems += @"
  {
    color: '$colorEsc',
    dimensiones: '$dimEsc',
    sku: '$skuEsc',
    barcode: '$barEsc',
    precio: $precio,
    categoria: '$catEsc',
    previewColor: '$previewHex',
  }
"@
    }

    $allPresets = $tsItems -join ",`n"

    $fileContent = @"
import { PresetProduct } from '../types/label';

export const PRESET_PRODUCTS: PresetProduct[] = [
$allPresets
];
"@

    # Guardar en presets.ts con UTF-8
    [System.IO.File]::WriteAllText($OutputFile, $fileContent, [System.Text.Encoding]::UTF8)
    Write-Host "[EXITO] Generado exitosamente '$OutputFile' con $count productos." -ForegroundColor Green
}
finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) { $conn.Close() }
}
