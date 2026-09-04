# ☁️ Guía de Despliegue en Servidor VPS (Nube)
## Sistema Punto de Venta e Inventario WPC Bajío (SQL Server 2022 + .NET 9 API)

Esta guía documenta la instalación, configuración y puesta en marcha del Backend (.NET 9 API) y Base de Datos (SQL Server 2022) en un servidor VPS en la nube (Ubuntu 22.04 / 24.04 LTS), manteniendo el Frontend servido en Cloudflare Pages para conexión remota de alta disponibilidad 24/7.

---

### 🗺️ Arquitectura del Sistema en la Nube

```
                     CLOUDFLARE (CDN / Edge Global)
     ┌─────────────────────────────────────────────────────────────┐
     │  • Frontend Punto de Venta: https://pos.wpcbajio.com        │
     │  • Futuro E-commerce:       https://tienda.wpcbajio.com     │
     │  • Subdominio Seguro API:   https://api.wpcbajio.com        │
     └──────────────────────────────┬──────────────────────────────┘
                                    │ HTTPS Cifrado (WAF Cloudflare)
                                    ▼
                      SERVIDOR VPS (Ubuntu 22.04/24.04)
     ┌─────────────────────────────────────────────────────────────┐
     │  Nginx Reverse Proxy (Puerto 80 / 443)                      │
     │    │                                                        │
     │    ▼                                                        │
     │  Backend API (.NET 9 Kestrel en http://127.0.0.1:5000)      │
     │    │ (Conexión privada interna)                             │
     │    ▼                                                        │
     │  Microsoft SQL Server 2022 (PosLambrinDb en localhost:1433)│
     └─────────────────────────────────────────────────────────────┘
```

---

### 📋 Requisitos Previos

1. **Servidor VPS contratado**:
   - Sistema Operativo: **Ubuntu 22.04 LTS o 24.04 LTS**.
   - Especificaciones mínimas: 2 vCPU, 4 GB de RAM, 40+ GB SSD.
   - IP Pública del VPS (ejemplo: `142.93.xxx.xxx`).
2. **Dominio configurado en Cloudflare** (`wpcbajio.com`).
3. **Acceso SSH al servidor** (`root@<IP_VPS>`).

---

### 🚀 Paso 1: Conectar por SSH al Servidor VPS

Desde la PC del cliente (o tu máquina de desarrollo), abre PowerShell y conéctate al VPS:

```powershell
ssh root@<IP_DEL_VPS>
```

---

### ⚙️ Paso 2: Ejecutar el Script de Aprovisionamiento Automatizado

Una vez dentro del VPS, copia y ejecuta el script maestro [`setup_vps.sh`](file:///d:/Proyecto_PDV-CDC/scratch/setup_vps.sh):

```bash
# 1. Descargar el script de instalación y el esquema de base de datos
curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/main/scratch/setup_vps.sh -o setup_vps.sh
curl -fsSL https://raw.githubusercontent.com/UTLCDA/Proyecto_PDV-CDC/main/scratch/clean_init.sql -o clean_init.sql

# 2. Dar permisos de ejecución
chmod +x setup_vps.sh

# 3. Ejecutar aprovisionamiento
./setup_vps.sh
```

El script se encargará automáticamente de:
- Instalar Microsoft SQL Server 2022 Express Edition.
- Crear la base de datos `PosLambrinDb` y el usuario `wpcadminaam` con contraseña `Aaron2804#`.
- Montar las 26 tablas físicas y datos semilla (roles, permisos, admin).
- Instalar el runtime de .NET 9 ASP.NET Core.
- Crear el servicio de arranque automático `pos-api.service`.
- Configurar Nginx y el Firewall UFW.

---

### 📦 Paso 3: Publicar y Subir los Binarios de la API al VPS

Desde la máquina local / PC del cliente (donde está el código fuente):

```powershell
# 1. Compilar el Backend en modo Release
dotnet publish src/backend/Pos.Api/Pos.Api.csproj -c Release -o dist_vps_api

# 2. Subir los archivos al servidor VPS por SCP
scp -r dist_vps_api/* root@<IP_DEL_VPS>:/var/www/pos-api/

# 3. En el VPS, ajustar permisos e iniciar el servicio
ssh root@<IP_DEL_VPS> "chown -R www-data:www-data /var/www/pos-api && systemctl restart pos-api && systemctl status pos-api"
```

---

### 🌐 Paso 4: Apuntar el Subdominio en Cloudflare DNS

En el panel de control de **Cloudflare DNS** para `wpcbajio.com`:

1. Añade un registro **A**:
   - **Nombre**: `api`
   - **IPv4 Address**: `<IP_DEL_VPS>`
   - **Proxy status**: **Proxied (Nube Naranja activa)**

> 💡 Al estar la nube naranja activa en Cloudflare, Cloudflare proporciona el certificado SSL HTTPS gratuito de forma automática para `https://api.wpcbajio.com`.

---

### 💻 Paso 5: Desplegar el Frontend en Cloudflare Pages

El frontend compilado se puede subir a **Cloudflare Pages** (gratuito e ilimitado):

1. En la máquina local, compilar el frontend:
   ```powershell
   npm --prefix src/frontend/pos-web run build
   ```
2. En el panel de Cloudflare:
   - Ve a **Workers & Pages** -> **Create application** -> pestaña **Pages**.
   - Puedes subir directamente la carpeta `src/frontend/pos-web/dist` o vincular tu repositorio de GitHub para despliegue continuo automático.
   - En **Custom Domains**, asigna: **`pos.wpcbajio.com`**.

---

### ✅ Verificación de Acceso Final

- **API Swagger / Endpoints**: `https://api.wpcbajio.com/swagger`
- **Punto de Venta Web**: `https://pos.wpcbajio.com`
- **Credenciales Maestras**:
  - **Usuario**: `admin`
  - **Contraseña**: `Admin123!`
  - **Rol**: `Administrador`
