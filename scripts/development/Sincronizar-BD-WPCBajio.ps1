# ==============================================================================
# Lanzador de Sincronización Total de Base de Datos (VPS -> Local DEV)
# WPC Bajío - Sistema Punto de Venta (PDV)
# ==============================================================================
Clear-Host
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  WPC BAJIO POS - SINCRONIZACION DE BASE DE DATOS (VPS -> DEV)" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Iniciando proceso completo en 1 solo paso:`n" -ForegroundColor Gray
Write-Host "  1. Generar respaldo fresco en caliente en VPS (193.46.198.88)" -ForegroundColor Gray
Write-Host "  2. Descargar respaldo a carpeta local (D:\Proyecto_PDV-CDC\backups)" -ForegroundColor Gray
Write-Host "  3. Restaurar base de datos local (PosLambrinDb y PosLambrinDb_Dev)" -ForegroundColor Gray
Write-Host "  4. Validar conteos de tablas y registros actualizados" -ForegroundColor Gray
Write-Host "--------------------------------------------------------------------" -ForegroundColor Cyan

$scriptPath = "D:\Proyecto_PDV-CDC\scripts\development\sync-db-from-vps.ps1"

if (!(Test-Path $scriptPath)) {
    Write-Host "`n[ERROR]: No se encontro el script maestro en: $scriptPath" -ForegroundColor Red
} else {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath
}

Write-Host "`nPresiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
