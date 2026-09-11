<#
.SYNOPSIS
  Inicia el WPC Media Studio (Portal Fachada Privado DEV) en el puerto 5175 y abre el navegador.
#>

$studioPath = "D:\Proyecto_PDV-CDC\src\frontend\media-studio"
$url = "http://localhost:5175/"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "   WPC BAJIO — MEDIA STUDIO PRIVADO (DEV / ADMIN)" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Iniciando servidor en puerto 5175..." -ForegroundColor Gray

# Verificar si el puerto ya está escuchando
$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 5175 -InformationLevel Quiet -WarningAction SilentlyContinue

if (!$conn) {
    Write-Host "Lanzando proceso Vite en segundo plano..." -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$studioPath`" && npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "El servicio ya se encuentra activo en el puerto 5175." -ForegroundColor Green
}

Write-Host "Abriendo portal en el navegador: $url" -ForegroundColor Cyan
Start-Process $url

Write-Host "Portal listo. Este sistema es de uso exclusivo para DEV y no afecta el PDV." -ForegroundColor Gray
