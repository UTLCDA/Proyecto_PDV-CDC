# ==============================================================================
# Script para descargar respaldos de la Base de Datos desde el VPS a tu máquina
# WPC Bajío - Sistema Punto de Venta (PDV)
# ==============================================================================
param(
    [string]$VpsHost = "193.46.198.88",
    [string]$VpsUser = "root",
    [ValidateSet("Latest", "All")]
    [string]$Mode = "Latest"
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Resolve-Path "$PSScriptRoot\..\.."
$BackupDir = Join-Path $WorkspaceRoot "backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

Write-Host "`n>>> [1/3] Consultando respaldos disponibles en el VPS ($VpsHost)..." -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no "$VpsUser@$VpsHost" "ls -lh /var/backups/pos-database/PosLambrinDb_*.bak"

if ($Mode -eq "Latest") {
    Write-Host "`n>>> [2/3] Descargando el ÚLTIMO respaldo (PosLambrinDb_latest.bak)..." -ForegroundColor Cyan
    $targetFile = Join-Path $BackupDir "PosLambrinDb_latest.bak"
    scp -o StrictHostKeyChecking=no "$VpsUser@${VpsHost}:/var/backups/pos-database/PosLambrinDb_latest.bak" $targetFile
} else {
    Write-Host "`n>>> [2/3] Descargando TODOS los respaldos semanales..." -ForegroundColor Cyan
    scp -o StrictHostKeyChecking=no "$VpsUser@${VpsHost}:/var/backups/pos-database/PosLambrinDb_*.bak" "$BackupDir\"
}

Write-Host "`n>>> [3/3] Archivos guardados en tu equipo local ($BackupDir):" -ForegroundColor Green
Get-ChildItem -Path $BackupDir -Filter "*.bak" | Select-Object Name, @{Name="Tamano (MB)"; Expression={[math]::Round($_.Length / 1MB, 2)}}, LastWriteTime | Format-Table -AutoSize

Write-Host "Descarga finalizada con éxito.`n" -ForegroundColor Green
