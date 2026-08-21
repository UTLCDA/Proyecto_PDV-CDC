#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Instalación Automatizada para WPC Bajío (Punto de Venta e Inventarios)
Despliega el Backend (API .NET 9) y Frontend (React SPA) en IIS Local y SQL Server.

Uso:
    python install_local_iis.py
(Debe ejecutarse en una consola con permisos de ADMINISTRADOR en Windows)
"""

import os
import sys
import shutil
import subprocess
import ctypes
import webbrowser
from pathlib import Path

# Colorantes para consola en Windows / ANSI
COLOR_CYAN = "\033[96m"
COLOR_GREEN = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED = "\033[91m"
COLOR_RESET = "\033[0m"

def print_header(title):
    print(f"\n{COLOR_CYAN}{'='*75}{COLOR_RESET}")
    print(f"{COLOR_CYAN}   {title}{COLOR_RESET}")
    print(f"{COLOR_CYAN}{'='*75}{COLOR_RESET}\n")

def print_step(step_num, title):
    print(f"\n{COLOR_YELLOW}[{step_num}] {title}...{COLOR_RESET}")

def print_success(msg):
    print(f"  {COLOR_GREEN}-> {msg}{COLOR_RESET}")

def print_error(msg):
    print(f"  {COLOR_RED}-> {msg}{COLOR_RESET}")

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def main():
    print_header("INSTALADOR AUTOMATIZADO DE WPC BAJÍO — PUNTO DE VENTA EN IIS LOCAL")

    if not is_admin():
        print_error("ERROR: Este script requiere permisos de ADMINISTRADOR.")
        print_error("Por favor, abre la consola (CMD o PowerShell) seleccionando 'Ejecutar como administrador'.")
        sys.exit(1)

    workspace_root = Path(__file__).resolve().parent
    api_publish_path = Path(r"C:\inetpub\wwwroot\pos-api")
    web_publish_path = Path(r"C:\inetpub\wwwroot\pos-web")

    # 1. Habilitar Características de Windows para IIS mediante DISM
    print_step("1/6", "Verificando e Instalando Características de IIS en Windows (DISM)")
    dism_cmd = [
        "dism.exe", "/Online", "/Enable-Feature",
        "/FeatureName:IIS-WebServerRole",
        "/FeatureName:IIS-WebServer",
        "/FeatureName:IIS-ManagementConsole",
        "/FeatureName:IIS-StaticContent",
        "/All", "/NoRestart"
    ]
    try:
        subprocess.run(dism_cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print_success("Características de IIS verificadas en Windows.")
    except Exception as ex:
        print_error(f"Advertencia al ejecutar DISM: {ex}")

    # 2. Compilar y Publicar Backend API (.NET 9)
    print_step("2/6", "Compilando y Publicando Backend API (.NET 9)")
    api_proj = workspace_root / "src" / "backend" / "Pos.Api" / "Pos.Api.csproj"
    if not api_proj.exists():
        print_error(f"No se encontró el proyecto API en {api_proj}")
        sys.exit(1)

    dotnet_cmd = ["dotnet", "publish", str(api_proj), "-c", "Release", "-o", str(api_publish_path)]
    print(f"  Ejecutando: {' '.join(dotnet_cmd)}")
    res_api = subprocess.run(dotnet_cmd)
    if res_api.returncode == 0:
        print_success(f"Backend API publicado exitosamente en '{api_publish_path}'.")
    else:
        print_error("Error durante la publicación de la API backend.")
        sys.exit(1)

    # 3. Compilar y Publicar Frontend SPA (React + Vite)
    print_step("3/6", "Compilando y Publicando Frontend SPA (React + Vite)")
    frontend_dir = workspace_root / "src" / "frontend" / "pos-web"
    if not frontend_dir.exists():
        print_error(f"No se encontró el directorio del frontend en {frontend_dir}")
        sys.exit(1)

    npm_cmd = "npm run build"
    print(f"  Ejecutando '{npm_cmd}' en {frontend_dir}...")
    res_web = subprocess.run(npm_cmd, cwd=str(frontend_dir), shell=True)
    if res_web.returncode == 0:
        dist_dir = frontend_dir / "dist"
        web_publish_path.mkdir(parents=True, exist_ok=True)
        shutil.copytree(dist_dir, web_publish_path, dirs_exist_ok=True)
        print_success(f"Frontend SPA publicado exitosamente en '{web_publish_path}'.")
    else:
        print_error("Error durante la compilación del Frontend SPA.")
        sys.exit(1)

    # 4. Configurar web.config para SPA Routing en IIS
    print_step("4/6", "Generando web.config para Enrutamiento SPA en IIS")
    web_config_content = """<?xml version="1.0" encoding="utf-8"?>
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
"""
    web_config_file = web_publish_path / "web.config"
    with open(web_config_file, "w", encoding="utf-8") as f:
        f.write(web_config_content)
    print_success(f"web.config escrito correctamente en '{web_config_file}'.")

    # 5. Configurar Pools de Aplicaciones y Sitios Web mediante appcmd.exe de IIS
    print_step("5/6", "Configurando Sitios Web y AppPools en IIS (appcmd.exe)")
    appcmd = Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "inetsrv" / "appcmd.exe"

    if appcmd.exists():
        # Crear Pools de Aplicaciones (Sin Código Administrado)
        subprocess.run([str(appcmd), "add", "apppool", "/name:PosApiPool", "/managedRuntimeVersion:"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([str(appcmd), "add", "apppool", "/name:PosWebPool", "/managedRuntimeVersion:"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Eliminar sitios previos si existen para reconfigurar
        subprocess.run([str(appcmd), "delete", "site", "PosApi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([str(appcmd), "delete", "site", "PosWeb"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Crear Sitio Backend API (Puerto 5000)
        cmd_site_api = [
            str(appcmd), "add", "site", "/name:PosApi",
            "/bindings:http/*:5000:",
            f"/physicalPath:{api_publish_path}"
        ]
        subprocess.run(cmd_site_api, check=False)
        subprocess.run([str(appcmd), "set", "site", "/site.name:PosApi", "/[path='/'].applicationPool:PosApiPool"], check=False)

        # Crear Sitio Frontend Web (Puerto 80)
        cmd_site_web = [
            str(appcmd), "add", "site", "/name:PosWeb",
            "/bindings:http/*:80:",
            f"/physicalPath:{web_publish_path}"
        ]
        subprocess.run(cmd_site_web, check=False)
        subprocess.run([str(appcmd), "set", "site", "/site.name:PosWeb", "/[path='/'].applicationPool:PosWebPool"], check=False)

        print_success("Sitios 'PosApi' (Puerto 5000) y 'PosWeb' (Puerto 80) configurados en IIS.")
    else:
        print_error(f"No se encontró appcmd.exe en {appcmd}. Por favor verifica que IIS esté instalado.")

    # 6. Crear Acceso Directo en el Escritorio
    print_step("6/6", "Creando Acceso Directo en el Escritorio")
    try:
        desktop_dir = Path(os.path.expanduser("~/Desktop"))
        shortcut_file = desktop_dir / "WPC Bajío — Punto de Venta.url"
        shortcut_content = """[InternetShortcut]
URL=http://localhost
IconIndex=0
IconFile=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
"""
        with open(shortcut_file, "w", encoding="utf-8") as sf:
            sf.write(shortcut_content)
        print_success(f"Acceso directo creado en '{shortcut_file}'.")
    except Exception as ex:
        print_error(f"No se pudo crear el acceso directo en el escritorio: {ex}")

    # Resumen Final
    print_header("¡INSTALACIÓN LOCAL DE WPC BAJÍO COMPLETADA CON ÉXITO!")
    print(" 🌐 Frontend Web (Punto de Venta): http://localhost")
    print(" ⚙️ Backend API (.NET 9):          http://localhost:5000")
    print(" 📄 Documentación de Despliegue:    docs/DESPLIEGUE_LOCAL_IIS.md\n")

    # Abrir navegador automáticamente
    try:
        webbrowser.open("http://localhost")
    except Exception:
        pass

if __name__ == "__main__":
    main()
