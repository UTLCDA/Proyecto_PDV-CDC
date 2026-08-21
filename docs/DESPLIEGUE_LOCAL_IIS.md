# Guía Completa de Despliegue Local e Instalación en IIS — WPC Bajío

Esta guía detalla los pasos exactos para instalar y publicar tanto el **Backend (API ASP.NET Core 9)** como el **Frontend (React SPA)** en el equipo físico de la tienda de **WPC Bajío** mediante IIS (Internet Information Services) y SQL Server.

---

## 🛠️ 1. Requisitos Previos en el Equipo del Local (Windows 10 / 11 / Server)

Antes de realizar la instalación, asegúrate de contar con los siguientes programas e ingredientes en el equipo:

1. **Activar IIS (Internet Information Services)**:
   - Presiona `Win + R`, escribe `optionalfeatures.exe` y presiona Enter.
   - Marca la casilla **Internet Information Services**.
   - Asegúrate de marcar en *Herramientas de administración web*: **Consola de administración de IIS**.
   - Presiona **Aceptar** y espera a que Windows instale las características.

2. **Instalar .NET 9.0 Hosting Bundle para IIS**:
   - Descarga e instala [.NET 9.0 Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/9.0) (módulo `AspNetCoreModuleV2`).
   - Tras la instalación, abre PowerShell como Administrador y ejecuta `net stop was /y` y luego `net start w3svc` para reiniciar IIS.

3. **Base de Datos SQL Server**:
   - Instala **SQL Server Express** o **SQL Server Developer Edition**.
   - Crea la base de datos `PosLambrinDb`.
   - Ejecuta las migraciones de Entity Framework Core o el script inicial SQL.

---

## ⚙️ 2. Publicación e Instalación del Backend (API .NET 9)

### Paso 2.1: Compilar y publicar los binarios de Release
En la terminal del proyecto, ejecuta el comando de publicación:
```powershell
dotnet publish src/backend/Pos.Api/Pos.Api.csproj -c Release -o C:\inetpub\wwwroot\pos-api
```

### Paso 2.2: Configurar la Cadena de Conexión
Abre el archivo `C:\inetpub\wwwroot\pos-api\appsettings.json` o crea `appsettings.Production.json` y configura la conexión a la base de datos SQL Server local:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=PosLambrinDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### Paso 2.3: Configurar la Aplicación en IIS Manager (`inetmgr`)
1. Presiona `Win + R`, escribe `inetmgr` y presiona Enter.
2. En el panel izquierdo, haz clic derecho en **Pools de aplicaciones** -> **Agregar pool de aplicaciones...**:
   - **Nombre**: `PosApiPool`
   - **Versión de .NET CLR**: **Sin código administrado (No Managed Code)**
   - **Modo de canalización**: Integrada
3. Haz clic derecho en **Sitios** -> **Agregar sitio web...**:
   - **Nombre del sitio**: `PosApi`
   - **Pool de aplicaciones**: `PosApiPool`
   - **Ruta física**: `C:\inetpub\wwwroot\pos-api`
   - **Enlace**: Tipo `http`, IP `Todas las no asignadas`, Puerto `5000` (o `60931`).
4. Haz clic en **Aceptar** y navega en el navegador a `http://localhost:5000/swagger` o `http://localhost:5000/api/v1/health` para verificar que responda correctamente.

---

## 🌐 3. Instalación del Frontend (SPA React + Vite)

### Paso 3.1: Compilar el Frontend de Producción
En la terminal del proyecto, ejecuta:
```powershell
npm --prefix src/frontend/pos-web run build
```
Esto creará la carpeta optimizada `src/frontend/pos-web/dist` con el bundle compilado.

### Paso 3.2: Copiar los Archivos a IIS
Copia todo el contenido de la carpeta `src/frontend/pos-web/dist` hacia `C:\inetpub\wwwroot\pos-web`.

### Paso 3.3: Configurar `web.config` para SPA Routing en IIS
Para evitar errores HTTP 404 al recargar la página (por el enrutamiento interno de React), crea el archivo `C:\inetpub\wwwroot\pos-web\web.config` con el siguiente contenido:

```xml
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
```
*(Nota: Requiere tener instalado el módulo de IIS **URL Rewrite** si deseas utilizar reglas de reescritura, o bien puedes servir la carpeta estática directamente en el puerto 80).*

### Paso 3.4: Configurar el Sitio Web del Frontend en IIS
1. En IIS Manager, haz clic derecho en **Sitios** -> **Agregar sitio web...**:
   - **Nombre del sitio**: `PosWeb`
   - **Pool de aplicaciones**: `DefaultAppPool` (o crear `PosWebPool` con *No Managed Code*).
   - **Ruta física**: `C:\inetpub\wwwroot\pos-web`
   - **Enlace**: Tipo `http`, Puerto `80` (o `8080`).
2. Haz clic en **Aceptar**.

---

## 📱 4. Configuración del Equipo del Local (Punto de Venta)

1. **Acceso Directo en el Escritorio**:
   - Haz clic derecho en el escritorio del equipo del local -> **Nuevo** -> **Acceso directo**.
   - Ubicación: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost`
   - Nombre: `WPC Bajío — Punto de Venta`
2. **Escáner de Código de Barras USB**:
   - Conecta el escáner al puerto USB. Al estar en el Punto de Venta, al escanear cualquier código de barras Lambrín (`WPC-...`), el escáner escribirá el código e ingresará el producto al carrito automáticamente.
3. **Impresora Térmica de Tickets (80mm / 58mm)**:
   - Configura la impresora térmica en Windows como la impresora predeterminada.
   - En el navegador Chrome/Edge, activa la opción **Impresión en segundo plano / Silenciosa** (`--kiosk-printing`) si deseas que imprima el ticket inmediatamente al dar clic en `Imprimir comprobante`.
