<#
.SYNOPSIS
    Script de Instalación Automatizada para WPC Bajío (Punto de Venta e Inventarios)
    Despliega el Backend (API .NET 9) y Frontend (React SPA) en IIS Local y SQL Server.

.NOTES
    Este script debe ejecutarse como ADMINISTRADOR en PowerShell.
#>

# 1. Verificar Privilegios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "==========================================================================" -ForegroundColor Red
    Write-Host " Error: Este script requiere permisos de Administrador." -ForegroundColor Red
    Write-Host " Por favor, vuelve a abrir PowerShell seleccionando 'Ejecutar como administrador'." -ForegroundColor Red
    Write-Host "==========================================================================" -ForegroundColor Red
    Exit 1
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   INSTALADOR AUTOMATIZADO DE WPC BAJÍO — PUNTO DE VENTA EN IIS LOCAL" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

$workspaceRoot = Get-Location
$apiPublishPath = "C:\inetpub\wwwroot\pos-api"
$webPublishPath = "C:\inetpub\wwwroot\pos-web"

# 2. Habilitar Características de Windows para IIS
Write-Host "[1/6] Verificando e Instalando Características de IIS en Windows..." -ForegroundColor Yellow
try {
    Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole" -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
    Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServer" -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
    Enable-WindowsOptionalFeature -Online -FeatureName "IIS-ManagementConsole" -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
    Enable-WindowsOptionalFeature -Online -FeatureName "IIS-StaticContent" -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  -> Características de IIS verificadas e instaladas correctamente." -ForegroundColor Green
} catch {
    Write-Host "  -> Advertencia al habilitar características de IIS: $_" -ForegroundColor DarkYellow
}

# 3. Compilar y Publicar Backend API (.NET 9)
Write-Host ""
Write-Host "[2/6] Compilando y Publicando Backend API (.NET 9)..." -ForegroundColor Yellow
$apiProjPath = Join-Path $workspaceRoot "src\backend\Pos.Api\Pos.Api.csproj"
if (Test-Path $apiProjPath) {
    dotnet publish $apiProjPath -c Release -o $apiPublishPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  -> Backend API publicado exitosamente en '$apiPublishPath'." -ForegroundColor Green
    } else {
        Write-Host "  -> Error al publicar Backend API." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "  -> No se encontró el proyecto backend en '$apiProjPath'." -ForegroundColor Red
    Exit 1
}

# 4. Compilar y Publicar Frontend SPA (React + Vite)
Write-Host ""
Write-Host "[3/6] Compilando y Publicando Frontend SPA (React)..." -ForegroundColor Yellow
$frontendPath = Join-Path $workspaceRoot "src\frontend\pos-web"
if (Test-Path $frontendPath) {
    npm --prefix $frontendPath run build
    if ($LASTEXITCODE -eq 0) {
        if (-not (Test-Path $webPublishPath)) {
            New-Item -ItemType Directory -Path $webPublishPath -Force | Out-Null
        }
        $distPath = Join-Path $frontendPath "dist"
        Copy-Item -Path "$distPath\*" -Destination $webPublishPath -Recurse -Force
        Write-Host "  -> Frontend SPA publicado exitosamente en '$webPublishPath'." -ForegroundColor Green
    } else {
        Write-Host "  -> Error al compilar Frontend SPA." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host "  -> No se encontró el proyecto frontend en '$frontendPath'." -ForegroundColor Red
    Exit 1
}

# 5. Configurar web.config para SPA Routing en IIS (Heredoc con comillas simples para evitar expansión de variables)
$webConfigContent = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>
  </system.webServer>
</configuration>
'@
$webConfigFile = Join-Path $webPublishPath "web.config"
Set-Content -Path $webConfigFile -Value $webConfigContent -Encoding UTF8

# 6. Configurar Pools de Aplicaciones y Sitios Web en IIS
Write-Host ""
Write-Host "[4/6] Configurando Sitios y AppPools en Administrador de IIS..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction SilentlyContinue

# Pool API
if (-not (Test-Path "IIS:\AppPools\PosApiPool")) {
    New-Item "IIS:\AppPools\PosApiPool" | Out-Null
}
Set-ItemProperty "IIS:\AppPools\PosApiPool" -Name "managedRuntimeVersion" -Value ""

# Pool Web
if (-not (Test-Path "IIS:\AppPools\PosWebPool")) {
    New-Item "IIS:\AppPools\PosWebPool" | Out-Null
}
Set-ItemProperty "IIS:\AppPools\PosWebPool" -Name "managedRuntimeVersion" -Value ""

# Sitio API (Puerto 5000)
if (Get-Website -Name "PosApi" -ErrorAction SilentlyContinue) {
    Stop-Website -Name "PosApi" -ErrorAction SilentlyContinue
    Remove-Website -Name "PosApi" -ErrorAction SilentlyContinue
}
New-Website -Name "PosApi" -Port 5000 -PhysicalPath $apiPublishPath -ApplicationPool "PosApiPool" | Out-Null
Start-Website -Name "PosApi" -ErrorAction SilentlyContinue

# Sitio Web (Puerto 80)
if (Get-Website -Name "PosWeb" -ErrorAction SilentlyContinue) {
    Stop-Website -Name "PosWeb" -ErrorAction SilentlyContinue
    Remove-Website -Name "PosWeb" -ErrorAction SilentlyContinue
}
New-Website -Name "PosWeb" -Port 80 -PhysicalPath $webPublishPath -ApplicationPool "PosWebPool" | Out-Null
Start-Website -Name "PosWeb" -ErrorAction SilentlyContinue

Write-Host "  -> Sitio Backend API escuchando en: http://localhost:5000" -ForegroundColor Green
Write-Host "  -> Sitio Frontend Web escuchando en: http://localhost:80" -ForegroundColor Green

# 7. Crear Acceso Directo en el Escritorio
Write-Host ""
Write-Host "[5/6] Creando Acceso Directo en el Escritorio..." -ForegroundColor Yellow
try {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "WPC Bajío — Punto de Venta.url"
    $urlShortcut = @'
[InternetShortcut]
URL=http://localhost
IconIndex=0
IconFile=C:\Program Files\Google\Chrome\Application\chrome.exe
'@
    Set-Content -Path $shortcutPath -Value $urlShortcut -Encoding UTF8
    Write-Host "  -> Acceso directo creado en el escritorio." -ForegroundColor Green
} catch {
    Write-Host "  -> No se pudo crear el acceso directo en el escritorio." -ForegroundColor DarkYellow
}

# 8. Resumen Final
Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " ¡INSTALACIÓN LOCAL DE WPC BAJÍO COMPLETADA CON ÉXITO!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " 🌐 Frontend Web (Punto de Venta): http://localhost" -ForegroundColor White
Write-Host " ⚙️ Backend API (.NET 9):          http://localhost:5000" -ForegroundColor White
Write-Host " 📄 Documentación de Despliegue:    docs/DESPLIEGUE_LOCAL_IIS.md" -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Abrir el sitio web automáticamente
Start-Process "http://localhost"
