# HANDOFF — Resumen de Transferencia y Estado de Entrega (Producción Cloudflare & VPS)

## 📌 Hito Cumplido: Ordenamiento de Tablas (Table Sorting de 3 Estados)
- **Implementación**: Sistema unificado y tipado con `useTableSort.ts` y `SortableTh.tsx`.
- **Comportamiento**: 1er clic ascendente (↑), 2do clic descendente (↓), 3er clic restablece (⇅).
- **Módulos Integrados**:
  1. 🧾 Histórico de Ventas
  2. 💳 Histórico de Transacciones y Movimientos de Pago
  3. 📦 Catálogo de Productos WPC Bajío
  4. 📁 Catálogo de Categorías WPC Bajío
  5. 🏭 Control de Inventarios WPC Bajío
  6. 📋 Movimientos de Inventario
- **Validación Local**: Validado y aprobado por el usuario en entorno interactivo local.
- **Suite de Pruebas**: Vitest 35/35 pasadas, xUnit 68/68 pasadas.

## 📌 Hito Cumplido: Producción 100% Operativa en la Nube
- **Frontend SPA**: Desplegado en Cloudflare (`https://pos-wpcbajio.aaronarenasmartinez.workers.dev` / `https://pos.wpcbajio.com`) con Vite 6.4.3, React 18, y enrutamiento SPA mediante Wrangler Assets.
- **Backend .NET 9**: Operando en VPS Ubuntu 26.04 (`193.46.198.88`) bajo Nginx y `systemd` (`pos-api.service`) accesible vía `https://api.wpcbajio.com/api/v1`.
- **SQL Server 2022 Express**: Corriendo en contenedor Docker (`mssql-server`) con persistencia en `/var/opt/mssql`, base unificada `PosLambrinDb` y 26 tablas físicas autoritativas.
- **Validación**: Autenticación JWT y acceso al panel administrativo validados con éxito en tiempo real.

## 📌 HotFix — Carga de Imágenes HEIC, Compresión Canvas y Edición de Productos
1. **Soporte de Imágenes HEIC / HEIF**: Integrada librería `heic2any` con importación dinámica para convertir fotos de iPhone/iPad a JPEG automáticamente sin bloquear la carga.
2. **Compresión Canvas y Eliminación del Límite de 2 MB**: Utilidad reutilizable `imageProcessor.ts` (máx. 1200px, JPEG 82%) optimiza fotos a ~100–250 KB Base64.
3. **Edición y Reemplazo de Imágenes en Productos**: Modal de edición refleja foto actual, permite reemplazarla o eliminarla ("✕ Quitar foto").
4. **Evidencia Física en Inventarios**: Soporte HEIC y auto-compresión para fotos de evidencia.

## 📌 Feature — Conversión SKU a Guiones, Campo Color y Ficha Técnica PDF
- **Estandarización de SKU**: Al ingresar espacios en el SKU, se convierten automáticamente en guiones `-`.
- **Campo de Color y Persistencia BD**: Campo Color en formulario, dominio C# y columna `Color` en SQL Server `PosLambrinDb`.
- **Descarga de Ficha Técnica PDF (`technicalSheetGenerator.tsx`)**: Acción `📄 Ficha Técnica` en tabla con desglose de precios y regla comercial.

## 📌 Feature — SKU Libre Captura y Código de Barras Dinámico en Base64
- **SKU de Libre Captura**: Sin prefijo forzado `WPC-`.
- **Generador de Código de Barras Code 128 (`barcodeGenerator.ts`)**: Generación en tiempo real en Canvas, renderizado visual, guardado en Base64 y descarga de etiqueta PNG.

## 📌 Control de Acceso y Roles
- **Transacciones restringidas a Cajero**: Pestaña `💳 Transacciones` y endpoint `/api/v1/payments/transactions` requieren `reportes:ver_ventas`.
- **Codificación de Acentos y Edición de Roles**: Unicode NVARCHAR verificado en `PosLambrinDb` y gestión de permisos/roles.

## Despliegue y Compilación en VPS de Producción
1. **Instalación de .NET 9 SDK**:
   - Instalado SDK versión `9.0.317 linux-x64` en el servidor VPS (`193.46.198.88`) en `/usr/share/dotnet`.
2. **Clonado del Repositorio**:
   - Repositorio clonado en `/root/Proyecto_PDV-CDC` sobre la rama `version-final-de-PR` (commit `26fc950`).
3. **Compilación y Publicación**:
   - Ejecutado `dotnet publish /root/Proyecto_PDV-CDC/src/backend/Pos.Api/Pos.Api.csproj -c Release -o /var/www/pos-api/`.
4. **Protección de Configuración**:
   - `appsettings.json` preservado intacto con credenciales de SQL Server 2022 y JWT de producción.
5. **Nginx Reverse Proxy**:
   - Añadido `client_max_body_size 50M;` a `/etc/nginx/sites-available/pos-api` y recargado Nginx para evitar el error `413 Request Entity Too Large`.
6. **Estado del Servicio**:
   - `pos-api.service` reiniciado y respondiendo 200 OK en `https://api.wpcbajio.com/api/v1/health`.

## Resumen del HotFix Realizado
1. **Soporte de Imágenes HEIC / HEIF**:
   - Integrada librería `heic2any` con importación dinámica para convertir fotos tomadas en iPhones/iPads a JPEG automáticamente en el cliente sin bloquear la carga.
2. **Compresión Canvas y Eliminación del Límite de 2 MB**:
   - Creación de utilidad reutilizable [`imageProcessor.ts`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/utils/imageProcessor.ts) que redimensiona fotos a máximo 1200px y las comprime a JPEG calidad 82%.
   - Fotos pesadas de 5 MB a 20 MB se comprimen a ~100–250 KB en Base64, evitando errores de memoria, límites de red y saturación de la base de datos.
3. **Edición y Reemplazo de Imágenes en Productos**:
   - En [`PaginaCatalogoProductos.tsx`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/pages/Products/PaginaCatalogoProductos.tsx), el modal de edición ahora refleja correctamente la foto actual del producto, permite cambiarla por una nueva (con cualquier formato/peso) o eliminarla con el botón "✕ Quitar foto".
4. **Evidencia Física en Inventarios**:
   - Actualizado [`InventoryListPage.tsx`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/pages/Inventory/InventoryListPage.tsx) para usar el mismo procesador con soporte HEIC y auto-compresión.
5. **Suite de Pruebas**:
   - Vitest: 27/27 pasadas (100%).
   - Build Vite: Exitoso con `heic2any` dividido en chunk independiente.

## Resumen de Cambios Previos en PR
>>>>>>> version-final-de-PR
1. **Punto de Venta (PDV)**:
   - Botones rápidos renombrados a `Pieza +` y `Caja +`.
   - Filtro de búsqueda rápida integrado arriba de `📦 Catálogo rápido`.
   - Desglose detallado de piezas, cajas y m² en el carrito (`23 Pzas (2 Cjas + 3 Pzas) · $290.00 · 10.01 m²`).
   - Cobertura corregida para multiplicar la cantidad por la cobertura por pieza (`coveragePerUnitSqM`).
   - Incorporación de **Calculadora de m² de Lambrín** en la tarjeta de cobro (`pos-checkout`) con cálculo automático de piezas/cajas y adición en 1 clic.
   - Modal rápido para alta de clientes directamente desde caja por cajeros.
   - Incrementadas imágenes de tarjetas de 62px a 92px.
2. **Catálogo de Productos y Costo Neto**:
   - Inclusión del campo `Costo Neto / Inicial ($ MXN)` en el modal de alta/edición de productos.
   - Persistencia de `CostoUnitario` que alimenta Costo Neto (COGS) y Ganancia en los Movimientos de Inventario.
   - Encabezados bilingües en la tabla del catálogo (`Precio Menudeo / 零售价` y `Precio Mayoreo / 批发价`).
3. **Control de Clientes y Límites Diarios**:
   - Permiso `clientes:limite_diario` y campo `LimiteCajasDiarias` en entidad `Cliente`.
   - Validación autoritativa en `SaleApplicationService` que impide rebasar el límite diario de cajas.
   - Modal de Historial de Compras de Cliente para consulta de cajeros y administradores.
4. **Movimientos de Inventario, Turnos de Caja y Reportería Bilingüe**:
   - Folio limpio `Venta #X` en la columna Motivo de Movimientos de Inventario y folios secuenciales `CAJA-YYYYMMDD-1` en la tarjeta de caja (`cash-card`), turnos de caja, listado de historial y bitácora de auditoría.
   - Cancelación de Ventas restringida a Administradores (`ventas:cancelar`), con reintegración automática de existencias a `Stocks` y sincronización en tiempo real con el esperado del Corte de Caja.
   - Impuesto ajustado a `$0.00` para ventas no facturadas.
   - Exportaciones PDF y Excel con 100% de encabezados bilingües en Español y Chino Simplificado, con registro singleton de fuentes CJK para exportaciones de alto rendimiento en milisegundos.

## Resumen Ejecutivo de la Iteración

Se ha configurado la base de datos limpia de SQL Server con autenticación de usuario (`wpcadminaam`), se montó el esquema autoritativo de 26 tablas e insertaron las semillas de inicio. Adicionalmente, el Backend API y el Frontend SPA se compilaron en modo producción y se publicaron en los directorios de IIS (`C:\inetpub\wwwroot\pos-api` y `C:\inetpub\wwwroot\pos-web`).

### Configuración de Base de Datos SQL Server (SSMS 20):
- **Server name**: `.` (o `localhost`)
- **Authentication**: `SQL Server Authentication`
- **Login**: `wpcadminaam`
- **Password**: `Aaron2804#`
- **Database**: `PosLambrinDb` (26 tablas creadas)

### Estado del Despliegue IIS:
- **Frontend SPA (Punto de Venta)**: `http://localhost` (`C:\inetpub\wwwroot\pos-web`)
- **Backend API (.NET 9)**: `http://localhost:5000` (`C:\inetpub\wwwroot\pos-api`)

## Estado de la Suite de Pruebas
- Frontend Vitest: **24/24** pasadas (100%).
- Backend xUnit: **68/68** pasadas (100%).
- Pruebas Totales: **92/92** pasadas al 100%.

## Servidores de Desarrollo Activos
- Backend API (.NET 9): `http://localhost:5000`
- Frontend Web SPA (React + Vite): `http://localhost:5173`
