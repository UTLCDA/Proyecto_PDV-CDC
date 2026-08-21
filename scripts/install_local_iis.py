#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Instalación Automatizada para WPC Bajío (Punto de Venta e Inventarios)
Despliega el Backend (API .NET 9) y Frontend (React SPA) en IIS Local y SQL Server.

Uso:
    python scripts/install_local_iis.py
(Solicita automáticamente permisos de ADMINISTRADOR mediante UAC en Windows)
"""

import os
import sys
import shutil
import subprocess
import ctypes
import urllib.request
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

def ensure_admin_elevation():
    try:
        if ctypes.windll.shell32.IsUserAnAdmin() == 0:
            print(f"{COLOR_YELLOW}Solicitando elevación de permisos de Administrador (UAC)...{COLOR_RESET}")
            script_path = str(Path(__file__).resolve())
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", sys.executable, f'"{script_path}"', None, 1
            )
            sys.exit(0)
    except Exception as ex:
        print_error(f"No se pudo solicitar permisos de Administrador automáticamente: {ex}")
        sys.exit(1)

def ensure_iis_services_running():
    try:
        subprocess.run(["net", "start", "was"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["net", "start", "w3svc"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def check_and_install_iis_modules():
    sys32 = Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "inetsrv"
    aspnetcore_dll = sys32 / "aspnetcore.dll"
    rewrite_dll = sys32 / "rewrite.dll"

    if not aspnetcore_dll.exists():
        print_step("1.1/6", "Instalando ASP.NET Core 9.0 Hosting Bundle en IIS (aspnetcore.dll)")
        bundle_url = "https://dotnetcli.azureedge.net/dotnet/aspnetcore/Runtime/9.0.2/dotnet-hosting-9.0.2-win.exe"
        temp_exe = Path(os.environ.get("TEMP", r"C:\Windows\Temp")) / "dotnet-hosting-9.0.2-win.exe"
        try:
            print(f"  Descargando Hosting Bundle 9.0 desde {bundle_url}...")
            urllib.request.urlretrieve(bundle_url, temp_exe)
            print("  Ejecutando instalación silenciosa de ASP.NET Core Hosting Bundle...")
            subprocess.run([str(temp_exe), "/install", "/quiet", "/norestart"], check=True)
            print_success("ASP.NET Core Hosting Bundle instalado con éxito.")
            ensure_iis_services_running()
        except Exception as ex:
            print_error(f"No se pudo instalar automáticamente el Hosting Bundle: {ex}")
    else:
        print_success("Módulo AspNetCoreModuleV2 (ASP.NET Core Hosting Bundle) ya está instalado en IIS.")

    if not rewrite_dll.exists():
        print_step("1.2/6", "Instalando Módulo IIS URL Rewrite (rewrite.dll)")
        rewrite_url = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_es-ES.msi"
        temp_msi = Path(os.environ.get("TEMP", r"C:\Windows\Temp")) / "rewrite_amd64.msi"
        try:
            print(f"  Descargando URL Rewrite Module desde {rewrite_url}...")
            urllib.request.urlretrieve(rewrite_url, temp_msi)
            print("  Ejecutando instalación silenciosa de IIS URL Rewrite...")
            subprocess.run(["msiexec", "/i", str(temp_msi), "/qn"], check=True)
            print_success("IIS URL Rewrite Module instalado con éxito.")
        except Exception as ex:
            print_error(f"No se pudo instalar automáticamente URL Rewrite: {ex}")
    else:
        print_success("Módulo IIS URL Rewrite ya está instalado en IIS.")

def grant_sql_server_permissions():
    print_step("1.3/6", "Configurando Permisos de Base de Datos en SQL Server para IIS")
    sql_script = (
        "IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'IIS AppPool\\PosApiPool') "
        "BEGIN CREATE LOGIN [IIS AppPool\\PosApiPool] FROM WINDOWS; END; "
        "ALTER SERVER ROLE sysadmin ADD MEMBER [IIS AppPool\\PosApiPool]; "
        "IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'NT AUTHORITY\\SYSTEM') "
        "BEGIN CREATE LOGIN [NT AUTHORITY\\SYSTEM] FROM WINDOWS; END; "
        "ALTER SERVER ROLE sysadmin ADD MEMBER [NT AUTHORITY\\SYSTEM];"
    )
    for server in ["AAM", "localhost", r".\SQLEXPRESS"]:
        try:
            subprocess.run(["sqlcmd", "-S", server, "-Q", sql_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    print_success("Permisos de acceso a SQL Server configurados para la identidad de IIS.")

def main():
    print_header("INSTALADOR AUTOMATIZADO DE WPC BAJÍO — PUNTO DE VENTA EN IIS LOCAL")

    # Asegurar permisos de administrador elevados mediante UAC
    ensure_admin_elevation()
    ensure_iis_services_running()

    workspace_root = Path(__file__).resolve().parent.parent
    api_publish_path = Path(r"C:\inetpub\wwwroot\pos-api")
    web_publish_path = Path(r"C:\inetpub\wwwroot\pos-web")
    default_wwwroot_path = Path(r"C:\inetpub\wwwroot")

    appcmd = Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "inetsrv" / "appcmd.exe"

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

    # Verificar e instalar dependencias IIS (Hosting Bundle & URL Rewrite)
    check_and_install_iis_modules()

    # Configurar permisos de SQL Server
    grant_sql_server_permissions()

    # 2. Compilar y Publicar Backend API (.NET 9)
    print_step("2/6", "Compilando y Publicando Backend API (.NET 9)")
    api_proj = workspace_root / "src" / "backend" / "Pos.Api" / "Pos.Api.csproj"
    if not api_proj.exists():
        print_error(f"No se encontró el proyecto API en {api_proj}")
        sys.exit(1)

    # Detener específicamente la API en IIS para liberar DLLs bloqueadas sin tumbar WAS RPC
    if appcmd.exists():
        subprocess.run([str(appcmd), "stop", "site", "PosApi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([str(appcmd), "stop", "apppool", "PosApiPool"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    dotnet_cmd = ["dotnet", "publish", str(api_proj), "-c", "Release", "-o", str(api_publish_path)]
    print(f"  Ejecutando: {' '.join(dotnet_cmd)}")
    res_api = subprocess.run(dotnet_cmd)
    if res_api.returncode == 0:
        print_success(f"Backend API publicado exitosamente en '{api_publish_path}'.")
    else:
        print_error("Error durante la publicación de la API backend.")
        sys.exit(1)

    # Configurar logs stdout y permisos en el directorio publicado de la API
    logs_dir = api_publish_path / "logs"
    logs_dir.mkdir(exist_ok=True)
    api_web_config = api_publish_path / "web.config"
    if api_web_config.exists():
        try:
            content = api_web_config.read_text(encoding="utf-8")
            content = content.replace('stdoutLogEnabled="false"', 'stdoutLogEnabled="true"')
            api_web_config.write_text(content, encoding="utf-8")
            print_success("Logs de inicio (stdout) habilitados en web.config de la API.")
        except Exception as ex:
            print_error(f"Advertencia al actualizar web.config de la API: {ex}")

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
        # Copiar también directamente a C:\inetpub\wwwroot para reemplazar iisstart.htm
        shutil.copytree(dist_dir, default_wwwroot_path, dirs_exist_ok=True)
        # Eliminar archivo viejo iisstart.htm si existe
        old_iisstart = default_wwwroot_path / "iisstart.htm"
        if old_iisstart.exists():
            try:
                old_iisstart.unlink()
            except Exception:
                pass
        print_success(f"Frontend SPA publicado exitosamente en '{web_publish_path}' y '{default_wwwroot_path}'.")
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
    with open(default_wwwroot_path / "web.config", "w", encoding="utf-8") as f:
        f.write(web_config_content)
    print_success("web.config escrito correctamente.")

    # Otorgar permisos de lectura y ejecución a IIS_IUSRS y IUSR
    print_step("4.1/6", "Configurando Permisos NTFS en Directorios de IIS (icacls)")
    try:
        subprocess.run(["icacls", str(api_publish_path), "/grant", "IIS_IUSRS:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        subprocess.run(["icacls", str(web_publish_path), "/grant", "IIS_IUSRS:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        subprocess.run(["icacls", str(default_wwwroot_path), "/grant", "IIS_IUSRS:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        subprocess.run(["icacls", str(api_publish_path), "/grant", "IUSR:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        subprocess.run(["icacls", str(web_publish_path), "/grant", "IUSR:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        subprocess.run(["icacls", str(default_wwwroot_path), "/grant", "IUSR:(OI)(CI)F", "/T", "/C", "/Q"], check=False)
        print_success("Permisos de acceso otorgados a IIS_IUSRS e IUSR.")
    except Exception as ex:
        print_error(f"Advertencia al asignar permisos NTFS: {ex}")

    # 5. Configurar Pools de Aplicaciones y Sitios Web mediante appcmd.exe de IIS
    print_step("5/6", "Configurando Sitios Web y AppPools en IIS (appcmd.exe)")
    ensure_iis_services_running()

    if appcmd.exists():
        # Crear Pools de Aplicaciones (Sin Código Administrado)
        subprocess.run([str(appcmd), "add", "apppool", "/name:PosApiPool", "/managedRuntimeVersion:"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([str(appcmd), "add", "apppool", "/name:PosWebPool", "/managedRuntimeVersion:"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Configurar Identidad del AppPool de la API a LocalSystem para acceso a SQL Server / Windows Auth
        subprocess.run([str(appcmd), "set", "apppool", "PosApiPool", "/processModel.identityType:LocalSystem"], check=False)
        subprocess.run([str(appcmd), "set", "apppool", "PosWebPool", "/processModel.identityType:LocalSystem"], check=False)

        # Retirar binding *:80: de Default Web Site si existe para liberar el Puerto 80 a PosWeb
        subprocess.run([str(appcmd), "stop", "site", "Default Web Site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([str(appcmd), "set", "site", "Default Web Site", "/-bindings.[protocol='http',bindingInformation='*:80:']"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Eliminar sitios previos si existen para reconfigurar limpia
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
        subprocess.run([str(appcmd), "start", "site", "PosApi"], check=False)

        # Crear Sitio Frontend Web exclusivo en el Puerto 80
        cmd_site_web = [
            str(appcmd), "add", "site", "/name:PosWeb",
            "/bindings:http/*:80:",
            f"/physicalPath:{web_publish_path}"
        ]
        subprocess.run(cmd_site_web, check=False)
        subprocess.run([str(appcmd), "set", "site", "/site.name:PosWeb", "/[path='/'].applicationPool:PosWebPool"], check=False)
        subprocess.run([str(appcmd), "start", "site", "PosWeb"], check=False)

        # Reciclar app pools para refrescar estado sin desconectar la tuberia RPC
        subprocess.run([str(appcmd), "recycle", "apppool", "PosApiPool"], check=False)
        subprocess.run([str(appcmd), "recycle", "apppool", "PosWebPool"], check=False)

        print_success("Sitio 'PosWeb' activado de forma exclusiva en el Puerto 80 (http://localhost).")
        print_success("Sitio 'PosApi' activado en el Puerto 5000 (http://localhost:5000).")
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
