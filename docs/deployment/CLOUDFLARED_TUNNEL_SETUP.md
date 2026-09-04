# 🌐 Guía de Configuración de Túnel Cloudflare (`cloudflared`)
## Sistema Punto de Venta e Inventario WPC Bajío

Esta guía documenta el procedimiento paso a paso para exponer de manera segura y cifrada el sistema Punto de Venta WPC Bajío (Frontend Web y Backend API) a Internet utilizando **Cloudflare Tunnels (`cloudflared`)**.

---

### 🚀 Ventajas del Túnel Cloudflare vs. Apertura Tradicional de Puertos

- **Sin Apertura de Puertos (No Port Forwarding)**: No requiere abrir puertos en el módem/router ni contratar IP pública estática. Funciona sobre conexiones CGNAT.
- **Certificado SSL/TLS Automático**: Tráfico HTTPS cifrado de extremo a extremo sin costo.
- **Protección Anti-DDoS y Firewall Global**: Filtrado de tráfico malicioso a través de la red global de Cloudflare.
- **Acceso Remoto Seguro**: Permite que sucursales, vendedores en campo y administradores accedan desde dispositivos móviles, tablets o PCs remotas.

---

### 📋 Requisitos Previos

1. Dominio registrado y administrado en Cloudflare (ej. `wpcbajio.com`).
2. Equipo Servidor local ejecutando Windows con:
   - **Frontend IIS**: `http://localhost:80`
   - **Backend API .NET 9**: `http://localhost:5000`
3. Privilegios de Administrador en la máquina servidora.

---

### 📦 Paso 0: Actualizar y Recompilar Frontend para IIS

Antes de habilitar el túnel, asegúrate de compilar la última versión del frontend (que incluye la detección dinámica de URLs del túnel) y publicarla en IIS:

```powershell
# 1. Bajar últimos cambios en main
git checkout main
git pull origin main

# 2. Recompilar paquete de producción
npm --prefix src/frontend/pos-web run build

# 3. Copiar archivos al directorio de IIS
Copy-Item -Path "src/frontend/pos-web/dist/*" -Destination "C:\inetpub\wwwroot\pos-web" -Recurse -Force
```

---

### 🛠️ Paso 1: Instalación de `cloudflared` en Windows

Abra PowerShell como **Administrador** e instale el ejecutable oficial de Cloudflare:

```powershell
# Opción A: Instalación vía Winget
winget install Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements

# Opción B (Recomendada si winget solicita confirmación interactiva UAC): Descarga directa del binario oficial
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "C:\Windows\System32\cloudflared.exe"

# Verificación de versión instalada
cloudflared --version
```

---

### 🔑 Paso 2: Autenticar `cloudflared` con su Cuenta de Cloudflare

Ejecute el siguiente comando para iniciar el inicio de sesión:

```powershell
cloudflared tunnel login
```

1. Se abrirá una ventana en el navegador solicitando seleccionar su dominio (ej. `wpcbajio.com`).
2. Seleccione el dominio y confirme la autorización.
3. Se descargará el archivo de credenciales de certificado en `C:\Users\<Usuario>\.cloudflared\cert.pem`.

---

### 🏗️ Paso 3: Crear el Túnel Nombrado para el PDV

Cree un nuevo túnel permanente llamado `wpc-pdv-tunnel`:

```powershell
cloudflared tunnel create wpc-pdv-tunnel
```

> 💡 **Nota**: Este comando generará un ID único de túnel (UUID) y guardará el archivo JSON de credenciales en `C:\Users\<Usuario>\.cloudflared\<TUNNEL_UUID>.json`. Tome nota de ese UUID.

---

### ⚙️ Paso 4: Crear Archivo de Configuración (`config.yml`)

Cree un archivo de configuración en `C:\Users\<Usuario>\.cloudflared\config.yml` con el siguiente contenido:

```yaml
tunnel: <INGRESE_AQUI_SU_TUNNEL_UUID>
credentials-file: C:\Users\<Usuario>\.cloudflared\<INGRESE_AQUI_SU_TUNNEL_UUID>.json

ingress:
  # 🌐 Frontend Web (Punto de Venta e IIS)
  - hostname: pos.wpcbajio.com
    service: http://localhost:80

  # ⚙️ Backend API (.NET 9 ASP.NET Core API)
  - hostname: api.wpcbajio.com
    service: http://localhost:5000

  # Regla final obligatoria (catch-all 404)
  - service: http_status:404
```

---

### 🌐 Paso 5: Asociar los Subdominios DNS

Vincule los subdominios de su dominio con el túnel recién creado:

```powershell
# Enrutar subdominio del Frontend POS
cloudflared tunnel route dns wpc-pdv-tunnel pos.wpcbajio.com

# Enrutar subdominio de la API Backend
cloudflared tunnel route dns wpc-pdv-tunnel api.wpcbajio.com
```

---

### 🧪 Paso 6: Prueba Manual del Túnel

Pruebe la conexión antes de instalar el servicio permanente:

```powershell
cloudflared tunnel run wpc-pdv-tunnel
```

Verifique ingresando desde su navegador web o celular a:
- **Frontend POS**: `https://pos.wpcbajio.com`
- **Backend API**: `https://api.wpcbajio.com/swagger`

---

### 🔄 Paso 7: Instalar como Servicio de Windows (Inicio Automático)

Para garantizar que el túnel inicie automáticamente cada vez que se encienda o reinicie el servidor:

```powershell
# 1. Instalar servicio de Windows
cloudflared service install

# 2. Iniciar el servicio
Start-Service cloudflared

# 3. Verificar estado del servicio
Get-Service cloudflared
```

---

### 🛡️ Paso 8: Ajustes Recomendados de Seguridad CORS en `appsettings.json`

En el archivo `src/backend/Pos.Api/appsettings.json` del Backend, agregue los dominios del túnel en la sección de orígenes CORS permitidos:

```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost",
    "http://localhost:5000",
    "https://pos.wpcbajio.com",
    "https://api.wpcbajio.com"
  ]
}
```

---

### 📌 Resumen de Subdominios y URLs Finales

| Componente | URL Local | URL Pública Cloudflare | Estado |
| :--- | :--- | :--- | :--- |
| **Frontend POS (SPA React)** | `http://localhost:80` | `https://pos.wpcbajio.com` | ✅ HTTPS Cifrado |
| **Backend API (.NET 9)** | `http://localhost:5000` | `https://api.wpcbajio.com` | ✅ HTTPS Cifrado |
