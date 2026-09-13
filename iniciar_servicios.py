"""
================================================================================
SCRIPT MAESTRO DE INICIO SIMULTÁNEO - WPC BAJÍO / PDV CDC
================================================================================
Levanta y supervisa en simultáneo:
 1. Backend API (.NET 9)               -> http://localhost:5000/swagger
 2. Visor de Etiquetas (Vite)          -> http://localhost:5173/
 3. Punto de Venta Web (Vite)          -> http://localhost:5174/
 4. Media Studio Catálogos (Vite)      -> http://localhost:5175/
 5. Tienda E-commerce (Next.js)        -> http://localhost:3000/

Características:
 - Detecta si un puerto ya está ocupado para no duplicar procesos.
 - Espera la respuesta HTTP en vivo mostrando estado visual.
 - Cierre seguro (Ctrl+C) cerrando todos los subprocesos en árbol.
 - Opción para abrir pestañas del navegador automáticamente.
================================================================================
"""

import os
import sys
import time
import socket
import signal
import urllib.request
import urllib.error
import subprocess
import webbrowser
from typing import List, Dict, Any, Optional

# Forzar UTF-8 en consolas de Windows para evitar errores con caracteres especiales
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Colores para la terminal de Windows
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

# Configuración de los 5 servicios
SERVICES: List[Dict[str, Any]] = [
    {
        "id": "backend",
        "name": "Backend API (.NET 9)",
        "dir": r"D:\Proyecto_PDV-CDC\src\backend\Pos.Api",
        "cmd": ["dotnet", "run", "--urls", "http://localhost:5000"],
        "port": 5000,
        "url": "http://localhost:5000/swagger",
        "health_url": "http://localhost:5000/api/v1/health",
        "open_browser": True
    },
    {
        "id": "etiquetas",
        "name": "Visor de Etiquetas",
        "dir": r"D:\Visozr Etiquetas",
        "cmd": ["npx.cmd", "vite", "--port", "5173", "--host"],
        "port": 5173,
        "url": "http://localhost:5173/",
        "health_url": "http://localhost:5173/",
        "open_browser": True
    },
    {
        "id": "pos_web",
        "name": "Punto de Venta (pos-web)",
        "dir": r"D:\Proyecto_PDV-CDC\src\frontend\pos-web",
        "cmd": ["npm.cmd", "run", "dev", "--", "--port", "5174", "--host"],
        "port": 5174,
        "url": "http://localhost:5174/",
        "health_url": "http://localhost:5174/",
        "open_browser": True
    },
    {
        "id": "media_studio",
        "name": "Media Studio",
        "dir": r"D:\Proyecto_PDV-CDC\src\frontend\media-studio",
        "cmd": ["npm.cmd", "run", "dev", "--", "--port", "5175", "--host"],
        "port": 5175,
        "url": "http://localhost:5175/",
        "health_url": "http://localhost:5175/",
        "open_browser": False
    },
    {
        "id": "ecommerce",
        "name": "E-commerce (Next.js)",
        "dir": r"D:\WPC-BajioEcommerce",
        "cmd": ["npm.cmd", "run", "dev"],
        "port": 3000,
        "url": "http://localhost:3000/",
        "health_url": "http://localhost:3000/",
        "open_browser": False
    }
]

processes: List[Dict[str, Any]] = []

def is_port_open(port: int, host: str = "localhost") -> bool:
    """Verifica si un puerto TCP está escuchando conexiones (soporta IPv4 e IPv6)."""
    try:
        with socket.create_connection((host, port), timeout=0.6):
            return True
    except Exception:
        return False

def check_http_ready(url: str, timeout: float = 1.0) -> bool:
    """Verifica si el servicio HTTP responde (cualquier código de respuesta HTTP válido)."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "WPC-ServiceChecker/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status < 500
    except urllib.error.HTTPError as e:
        # Respuestas como 401, 403, 404 indican que el servidor web ya está levantado y escuchando
        return e.code < 500
    except Exception:
        return False

def kill_process_tree(pid: int):
    """Mata un proceso y todos sus hijos usando taskkill en Windows."""
    try:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False
        )
    except Exception as e:
        print(f"{Colors.RED}Error al terminar PID {pid}: {e}{Colors.RESET}")

def signal_handler(sig, frame):
    """Maneja Ctrl+C limpiamente cerrando todos los procesos que este script inició."""
    print(f"\n\n{Colors.YELLOW}[*] Deteniendo todos los servicios iniciados...{Colors.RESET}")
    for proc_info in processes:
        proc = proc_info.get("process")
        name = proc_info.get("name")
        if proc and proc.poll() is None:
            print(f"  -> Apagando {name} (PID {proc.pid})...")
            kill_process_tree(proc.pid)
    print(f"{Colors.GREEN}[✓] Todos los servicios han sido detenidos correctamente.{Colors.RESET}\n")
    sys.exit(0)

def main():
    # Habilitar soporte de colores ANSI en consolas de Windows si es necesario
    if sys.platform == "win32":
        os.system("")

    signal.signal(signal.SIGINT, signal_handler)

    if "--status" in sys.argv or "-s" in sys.argv:
        print(f"{Colors.CYAN}{Colors.BOLD}")
        print("==================================================================")
        print("          ESTADO DE LOS SERVICIOS - WPC BAJÍO                    ")
        print("==================================================================")
        print(f"{Colors.RESET}")
        for s in SERVICES:
            online = is_port_open(s["port"])
            status_icon = f"{Colors.GREEN}● ONLINE {Colors.RESET}" if online else f"{Colors.RED}○ OFFLINE{Colors.RESET}"
            print(f"  {status_icon} | Puerto {s['port']:<5} | {s['name']:<24} -> {s['url']}")
        print()
        sys.exit(0)

    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("==================================================================")
    print("         INICIADOR SIMULTÁNEO DE SISTEMAS - WPC BAJÍO            ")
    print("==================================================================")
    print(f"{Colors.RESET}")

    # Verificar directorios
    for s in SERVICES:
        if not os.path.exists(s["dir"]):
            print(f"{Colors.RED}[!] Directorio no encontrado para {s['name']}: {s['dir']}{Colors.RESET}")

    # Iniciar los servicios
    print(f"{Colors.BOLD}[*] Verificando e iniciando servicios...{Colors.RESET}\n")
    
    for s in SERVICES:
        port = s["port"]
        name = s["name"]
        
        if is_port_open(port):
            print(f" {Colors.YELLOW}● {name:<26}{Colors.RESET} -> {Colors.GREEN}YA ESTÁ ACTIVO{Colors.RESET} en puerto {port} ({s['url']})")
            processes.append({
                "name": name,
                "process": None,
                "already_running": True,
                "url": s["url"],
                "open_browser": s["open_browser"]
            })
            continue

        if not os.path.exists(s["dir"]):
            print(f" {Colors.RED}✗ {name:<26}{Colors.RESET} -> Omitido (ruta no existe)")
            continue

        print(f" {Colors.CYAN}▶ Iniciando {name:<21}{Colors.RESET} en puerto {port}...")
        try:
            # Crear proceso en Windows en su propio grupo de procesos
            proc = subprocess.Popen(
                s["cmd"],
                cwd=s["dir"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
            )
            processes.append({
                "name": name,
                "process": proc,
                "already_running": False,
                "port": port,
                "url": s["url"],
                "health_url": s["health_url"],
                "open_browser": s["open_browser"]
            })
        except Exception as ex:
            print(f" {Colors.RED}✗ Fallo al iniciar {name}: {ex}{Colors.RESET}")

    print(f"\n{Colors.BOLD}[*] Esperando a que todos los servicios respondan...{Colors.RESET}")
    
    # Polling de salud (máximo 45 segundos)
    max_wait = 45
    start_time = time.time()
    pending = [p for p in processes if not p.get("already_running") and p.get("process")]

    while pending and (time.time() - start_time) < max_wait:
        ready = []
        for p in pending:
            if is_port_open(p["port"]) and check_http_ready(p["health_url"]):
                ready.append(p)
                print(f"  {Colors.GREEN}[✓ OK]{Colors.RESET} {p['name']} respondió correctamente en {p['url']}")
        
        for r in ready:
            pending.remove(r)
        
        if pending:
            time.sleep(1.2)

    if pending:
        for p in pending:
            print(f"  {Colors.YELLOW}[!] Advertencia:{Colors.RESET} {p['name']} aún no responde en HTTP tras {max_wait}s (sigue cargando).")

    print(f"\n{Colors.GREEN}{Colors.BOLD}==================================================================")
    print("               RESUMEN DE ACCESOS DIRECTOS                       ")
    print("==================================================================")
    print(f"{Colors.RESET}")
    for s in SERVICES:
        status_icon = f"{Colors.GREEN}● ONLINE{Colors.RESET}" if is_port_open(s["port"]) else f"{Colors.RED}○ OFFLINE{Colors.RESET}"
        print(f"  {status_icon:<18} | {s['name']:<24} -> {Colors.CYAN}{s['url']}{Colors.RESET}")

    print(f"\n{Colors.BOLD}Presiona {Colors.RED}Ctrl + C{Colors.RESET}{Colors.BOLD} en esta consola para detener todos los servicios iniciados.{Colors.RESET}")

    # Preguntar o abrir navegador automáticamente para los principales
    print("\nAbriendo navegador para el Visor de Etiquetas y PDV...")
    try:
        webbrowser.open("http://localhost:5173/")
    except Exception:
        pass

    # Mantener el script vivo para supervisar
    try:
        while True:
            time.sleep(2)
            # Verificar si algún proceso hijo murió inesperadamente
            for p in processes:
                proc = p.get("process")
                if proc and proc.poll() is not None:
                    print(f"{Colors.RED}[!] Proceso {p['name']} terminó inesperadamente con código {proc.returncode}{Colors.RESET}")
                    # Ya no verificar más para no spamear
                    p["process"] = None
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
