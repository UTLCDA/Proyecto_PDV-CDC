# HANDOFF — Resumen de Transferencia y Estado de Entrega (Producción Cloudflare & VPS)

## 📌 Hito Cumplido: Optimización de Almacenamiento y Entrega de Imágenes de Productos (Migración WebP + Static Files)
- **Rama Git**: `feature/optimizacion-storage-imagenes-productos`
- **Descripción**: Migración integral de la gestión de imágenes de productos desde cadenas Base64 embebidas en SQL Server (`nvarchar(max)`) y JSON a almacenamiento físico en disco en formato WebP optimizado con 3 variantes (`thumbnail.webp`, `pos.webp`, `preview.webp`), servido mediante ASP.NET Core Static Files con caché HTTP (`Cache-Control: public, max-age=604800, must-revalidate`), carga ágil en Punto de Venta (`pageSize: 40`), escaneo resiliente por código de barras hacia la API y migración automática de imágenes legadas.
- **Entregables Realizados**:
  1. **Servicio de Almacenamiento WebP (`LocalProductImageStorageService`)**:
     - Motor `SixLabors.ImageSharp` 4.1.1 con preservación de aspect ratio, eliminación de metadatos EXIF y compresión WebP por variante: `thumbnail.webp` (128x128, q75), `pos.webp` (256x256, q80), `preview.webp` (512x512, q85).
     - Almacenamiento atómico por carpeta `{productId}/` fuera de `wwwroot`.
     - Protección contra path-traversal y nombres fijos para prevenir archivos huérfanos.
  2. **Entrega de Archivos Estáticos y Caché**:
     - Configuración en `Program.cs` mediante `PhysicalFileProvider` sobre la ruta configurada en `Storage:ProductImagesPath`.
     - Encabezado `Cache-Control: public, max-age=604800, must-revalidate` (7 días).
  3. **Endpoints REST de Productos**:
     - `POST /api/v1/products/{id}/image`: Carga multipart (`IFormFile`) con validación de tipo MIME y tamaño máx 10 MB.
     - `DELETE /api/v1/products/{id}/image`: Eliminación física de archivos y reseteo de `ImagenUrl`.
     - `POST /api/v1/products/migrate-base64-images`: Migración masiva de Base64 legacy a WebP con reporte de convertidos/errores.
  4. **Optimización de Memoria y Rendimiento SQL**:
     - Removido `.Include(p => p.Imagenes)` en `GetProductsAsync`. Las consultas de catálogo ahora retornan DTOs esbeltos sin sobrecarga de memoria.
  5. **Frontend React + Vite**:
     - `PaginaCatalogoProductos.tsx`: Reemplazada la conversión Base64 en frontend por vista previa con `URL.createObjectURL` y subida multipart vía `uploadProductImage`. `loading="lazy"` y `decoding="async"`. Incorporado botón flotante `✕` y botón de acción destacado `🗑️ Eliminar Imagen / 删除图片` en el modal para remover la foto actual o descartar una selección por error sin afectar ni reiniciar ningún otro dato del producto.
     - `PaginaPuntoVenta.tsx`: Carga inicial reducida a `pageSize: 40`. Si un código de barras escaneado no está en memoria, `findAndAddProduct` consulta `GET /api/v1/products/code/{code}` para agregarlo al carrito al instante.
     - `apiClient.ts`: Soporte nativo de `FormData` sin forzar `application/json`.
  6. **Pruebas y Verificación**:
     - Backend: 84/84 pruebas unitarias y de integración superadas (100%).
     - Frontend: 47/47 pruebas Vitest aprobadas (100%) y build exitoso (11.69s, 0 errores).
- **Instrucciones para Despliegue en VPS (Producción)**:
  - Crear carpeta física en VPS: `mkdir -p /var/wpcbajio/data/products && chown -R www-data:www-data /var/wpcbajio/data/products` (o el usuario del contenedor/servicio).
  - Variable de entorno o `appsettings.Production.json`:
    ```json
    "Storage": {
      "ProductImagesPath": "/var/wpcbajio/data/products",
      "ProductImagesRequestPath": "/products"
    }
    ```
  - Si el backend corre en Docker, mapear el volumen: `-v /var/wpcbajio/data/products:/app/data/products` y configurar `"ProductImagesPath": "/app/data/products"`.
  - Ejecutar migración de imágenes legadas mediante `POST /api/v1/products/migrate-base64-images` con token de administrador.

## 📌 Hito Cumplido: Unificación Visual de Columnas de Precio en Catálogo de Productos
- **Rama Git**: `mantenimiento/unificar-columna-precios-catalogo`
- **Descripción**: Integración de las columnas "Precio Menudeo / 零售价" y "Precio Mayoreo / 批发价" en una sola columna visual en la tabla del catálogo para compactar el espacio horizontal, preservando la exportación a Excel y PDF con ambas columnas por separado.
- **Entregables Realizados**:
  1. **Columna Combinada en Catálogo**: Encabezado unificado `Precios (Men. / May.) / 价格 (零售 / 批发)` con ordenamiento interactivo por precio base. Celdas estilizadas con badges compactos `Men` y `May` con sus montos y umbrales mínimos.
  2. **Exportación Normal Preservada**: `exportConfig` mantiene las columnas independientes `unitPrice` y `wholesalePrice`, asegurando que las descargas en Excel y PDF no se vean alteradas.
  3. **Diccionario i18n Bilingüe**: Añadida clave `pricesCombined` para español y chino simplificado.
  4. **Pruebas y Verificación**: 47/47 pruebas Vitest y 77/77 pruebas de backend superadas con build limpio.

## 📌 Hito Cumplido: Optimización de Espacios en Punto de Venta (Ampliación de Catálogo y Compactación de Checkout)
- **Rama Git**: `mantenimiento-ajuste-pdv`
- **Descripción**: Reducción de ancho y compactación de espaciados de la columna de checkout (`.pos-checkout`) para permitir que la vista de catálogo (`.pos-card`) gane amplitud y muestre más tarjetas de productos en pantalla aprovechando al máximo la resolución horizontal.
- **Entregables Realizados**:
  1. **Redistribución de Columnas**: `.pos-layout` ahora asigna `minmax(0, 1fr)` al catálogo y fija/clampa el checkout a `clamp(295px, 24vw, 340px)`.
  2. **Grid de Productos Expandido**: `.pos-products` con rejilla auto-fill `minmax(235px, 1fr)` y gap `0.75rem`.
  3. **Compactación de Checkout**: Margen, relleno, tipografía y elementos de cliente, lista de carrito, facturación, totales, modalidad de pago y botón de cobro optimizados con dimensiones más esbeltas y sin espacios en blanco excesivos.
  4. **Pruebas y Verificación**: 47/47 pruebas Vitest aprobadas, build de producción 100% limpio y 77/77 pruebas de backend operativas.

## 📌 Hito Cumplido: Sincronización de Base de Datos Producción (VPS) a Entorno Local DEV y Respaldo Semanal
- **Descripción**: Respaldo completo de la base de datos de producción (`193.46.198.88`) extraído desde el contenedor `mssql-server` y restaurado localmente en `PosLambrinDb` y `PosLambrinDb_Dev`, permitiendo al desarrollador trabajar con los datos reales que los usuarios han insertado en producción (74 productos, 13 categorías, 74 existencias en stock, clientes y auditoría), además de la automatización de respaldos periódicos semanales en el VPS.
- **Entregables Realizados**:
  1. **Respaldo Automatizado en VPS**: Script `/usr/local/bin/backup-pos-db.sh` con política de retención para 8 semanas, registro en `/var/log/pos-db-backup.log` y archivo `/var/backups/pos-database/PosLambrinDb_latest.bak`.
  2. **Tarea Programada (Cron)**: Configurada en `crontab` de root para ejecutarse cada domingo a las 03:00 UTC (21:00 MX).
  3. **Restauración en SQL Server Local**: Restauración con reubicación física de archivos (`WITH MOVE`) en `PosLambrinDb` (base principal de desarrollo) y `PosLambrinDb_Dev` (réplica limpia de apoyo).
  4. **Script PowerShell Local**: [scripts/development/sync-db-from-vps.ps1](file:///d:/Proyecto_PDV-CDC/scripts/development/sync-db-from-vps.ps1) para sincronizar en cualquier momento con un solo comando.
  5. **Pruebas y Verificación**: 77/77 pruebas unitarias y de integración de backend pasando al 100%.

## 📌 Hito Cumplido: Estandarización Bilingüe Universal de Columnas y Alertas Reactivas
- **Rama Git**: `main`
- **Descripción**: Estandarización al 100% en formato `"Nombre Español / Nombre Chino"` de todas las cabeceras de columnas en todos los módulos de la aplicación, y reactividad dinámica total para alertas críticas del sistema (como la alerta de turno de caja sin aperturar y notificaciones de ventas) para que conmuten instantáneamente de idioma al cambiar a Chino Simplificado (`zh`).
- **Entregables Realizados**:
  1. **Alertas Reactivas del Punto de Venta**:
     - `noOpenShiftBanner` (*"⚠️ Atención: La caja no ha sido aperturada. Debes realizar la apertura de caja para poder procesar ventas."* / *"⚠️ 注意：钱箱尚未开扎。必须先开扎钱箱才能进行销售。"*) ahora es renderizado de forma reactiva con `t('noOpenShiftBanner')`. Al hacer clic en el botón de idioma del encabezado, el mensaje se traduce al instante en pantalla.
     - El manejador de notificaciones `notice` en `PaginaPuntoVenta.tsx` admite claves reactivas `key` con parámetros, traduciendo de inmediato validaciones de carrito vacío, montos de anticipo, descuentos excedentes, etc.
  2. **Estandarización de Encabezados de Tablas (Bilingüe Dual)**:
     - Formato `"Nombre Español / Nombre Chino"` establecido en `es` y `zh` para todas las columnas en:
       - Catálogo de Productos
       - Categorías
       - Clientes y modal de historial de compras
       - Inventario (existencias y umbrales)
       - Movimientos de Inventario y Evidencia Física
       - Cotizaciones y modal de desglose de partidas
       - Histórico de Ventas
       - Operaciones Comerciales (Transacciones, Abonos y Devoluciones)
       - Turno de Caja (Arqueos, Movimientos y Cortes)
       - Usuarios y Roles
       - Explorador de Bitácora de Auditoría
       - Reportes Ejecutivos
  3. **Verificación y Pruebas**:
     - `npm run test` (Vitest): 47/47 pruebas superadas al 100%.
     - `npm run build` (`tsc && vite build`): completado con éxito en 11.13s con 0 errores y 0 advertencias.

## 📌 Hito Cumplido: Mejoras al Módulo de Productos "Catálogo" (ABC, IdProducto e Inventario Actual)
- **Rama Git**: `main` (commit `33eee52`, fusionado desde PR #4 `mantenimiento/mejoras-catalogo-productos`).
- **Pull Request**: [PR #4 Merged](https://github.com/UTLCDA/Proyecto_PDV-CDC/pull/4)
- **Descripción**: Mejoras al módulo de productos "catálogo" solicitadas por el cliente.
- **Entregables Realizados**:
  1. **Identificador Secuencial `IdProducto` (Identity 1-1)**:
     - Añadido a `Producto` / `Product` y a todos los DTOs de backend y modelos de frontend.
     - Mapeado con EF Core `ValueGeneratedOnAdd()` y columna SQL Server `IDENTITY(1,1)` con índice único `IX_Products_IdProducto`. El GUID original `Id` sigue operando como PK/FK en todo el sistema.
     - Creada la migración `20260909231411_AddIdProductoIdentityToProducts`.
     - Implementado soporte simulador en `PosDbContext.cs` para pruebas unitarias con proveedor `InMemory`.
     - Soporte de búsqueda por texto extendido para coincidencia numérica exacta contra `IdProducto`.
     - Mostrado en la tabla del catálogo como primera columna "ID" (`#{p.idProducto}`) con capacidad de ordenamiento interactivo.
  2. **Columna "Inventario Actual" en Tabla de Catálogo**:
     - Columna visible con piezas totales en inventario (`p.availableQuantity`).
     - Insignia de estado (suficiente, bajo stock, agotado).
     - Soporte de ordenamiento por existencias (`stock`) en backend y frontend.
     - Textos internacionalizados en español y chino simplificado.
  3. **Acción de Eliminar Producto (Baja Lógica / ABC Completo)**:
     - Endpoint `DELETE /api/v1/products/{id}` en `ProductsController.cs` con política `Catalog.ProductsEdit`.
     - Desactivación lógica `EstaActivo = false` y registro en bitácora de auditoría (`PRODUCT_DELETED`).
     - Parámetro de filtrado `includeInactive` (por defecto `false`), con selector en frontend para alternar entre "Activos", "Inactivos" y "Todos".
     - Botón "🗑️ Eliminar" en acciones con modal bilingüe de confirmación y advertencia.
- **Pruebas y Verificación**:
  - Backend: 77/77 pruebas superadas al 100% (`dotnet test src/backend/Pos.sln`).
  - Frontend: 47/47 pruebas superadas al 100% (`npm run test`).
  - Build Frontend: `npm run build` completado exitosamente sin errores ni advertencias en 12.00s.

## 📌 Hito Cumplido: Diagnóstico y Corrección de Visibilidad de Paginación en Frontend
- **Rama Git**: `mantenimiento/mejoras-v2`
- **Problema Reportado**: "no veo la numeracion en el front".
- **Causa Raíz Resuelta**:
  1. `PagedResult<T>` en C# implementaba `IReadOnlyList<T>` / `IEnumerable`. System.Text.Json serializaba el resultado como un arreglo JSON plano `[...]` perdiendo las propiedades de metadatos (`totalItems`, `totalPages`, etc.).
  2. En el cliente, al no recibir `totalItems`, `pagination.totalItems` quedaba en `0`.
  3. `TablePagination.tsx` hacía un `return null` temprano cuando `totalItems === 0`.
- **Solución y Estado**:
  1. Se desacopló `PagedResult<T>` de `IEnumerable` en el Backend; ahora serializa un objeto JSON completo `{ items, pageNumber, pageSize, totalItems, totalPages }`.
  2. Se ajustaron los controladores y suites de integración para acceder a `Items`.
  3. Se robusteció `usePagination.ts` (`setPaginationFromResult`) para tolerar camelCase y PascalCase.
  4. Se actualizó `TablePagination.tsx` para mostrar siempre la barra de paginación incluso con 0 registros ("Sin registros" / "暂无数据" con botones deshabilitados) y mostrar siempre los números `[ 1 ]` cuando hay registros.
- **Validación**:
  - Backend: 73/73 pruebas xUnit superadas al 100%.
  - Frontend: 47/47 pruebas Vitest superadas al 100%.
  - Build Frontend: `npm run build` completado exitosamente en 10.72s.

## 📌 Hito Cumplido: Implementación del Componente de Paginación Numerada Reutilizable (`TablePagination`) en Todas las Tablas
- **Rama Git**: `mantenimiento/mejoras-v2`
- **Alcance Entregado**:
  1. **Componente Reutilizable (`TablePagination.tsx`)**:
     - Paginador numerado con lógica de elipses de 7 botones (`getPageNumbers`).
     - Botones `«`, `‹`, `›`, `»` y botones numéricos con estado activo e indicador accesible `aria-current="page"`.
     - Selector de tamaño de página (25, 50, 100).
     - Resumen dinámico bilingüe (Español / Chino Simplificado).
     - Handlers seguros `handlePageChange` y `handlePageSizeChange` que validan límites y estado `disabled`.
  2. **Diseño Visual (`TablePagination.css`)**:
     - Integración con los tokens oficiales de diseño de WPC Bajío (`--primary-main`, `--border-subtle`, `--background-surface`, `--text-main`, etc.).
     - Diseño responsive para pantallas móviles (< 640px).
  3. **Despliegue en el 100% de las Tablas Paginadas**:
     - `SalesHistoryPage.tsx`, `PaginaCatalogoProductos.tsx`, `CategoryListPage.tsx`, `CustomerListPage.tsx`, `InventoryListPage.tsx`, `InventoryMovementsPage.tsx`, `QuoteListPage.tsx`, `CommercialOpsPage.tsx` (Transacciones, Abonos, Devoluciones), `CashShiftPage.tsx` (Movimientos e Historial), `PaginaUsuarios.tsx`, `AuditLogPage.tsx`.
- **Pruebas y Verificación**:
  - Frontend: `npm run build` (`tsc && vite build`) completado con 0 errores; pruebas unitarias para `getPageNumbers` integradas en `usePagination.test.ts`.
  - Backend: 72/72 pruebas pasadas (100% xUnit).

## 📌 Hito Cumplido: Extensión de Paginación de Alto Rendimiento y Desacoplamiento de Filtros en Todo el Sistema
- **Rama Git**: `mantenimiento/mejoras-v2`
- **Alcance Completado**:
  - Tras el éxito de la optimización en el módulo de Ventas, se aplicó la misma arquitectura a **todos los demás módulos paginados del sistema**:
    1. **Backend**: Conteo limpio sin colecciones dependientes `CountAsync()`, selección paginada de IDs con `Skip().Take().Select(x => x.Id)`, y consulta dividida `.AsSplitQuery()` para hidratar entidades completas preservando el orden en:
       - `CommercialOperationsService.cs` (Cotizaciones, Devoluciones, Abonos, Transacciones).
       - `CatalogApplicationService.cs` (Productos, Categorías, Clientes).
       - `InventoryApplicationService.cs` (Existencias, Movimientos de Inventario).
       - `CashShiftApplicationService.cs` (Historial de Turnos).
       - `UserApplicationService.cs` (Usuarios y Roles).
       - `ReportingApplicationService.cs` (Bitácora de Auditoría).
    2. **Frontend**:
       - Desacoplamiento de efectos de carga respecto a los estados de los campos de entrada (`appliedFilters` triggered solo por Submit o Limpiar filtros).
       - Caching de catálogos y opciones estáticas para no re-consultar en cada cambio de página.
       - Desacoplamiento de llamadas en `CommercialOpsPage` (carga estática separada de la paginación de transacciones, devoluciones y abonos).
       - Inclusión uniforme del botón "Limpiar filtros" en todos los formularios de filtrado.
- **Validación**:
  - Pruebas Backend: 72/72 pasadas (100% xUnit: Domain, Application e IntegrationTests).
  - Build Frontend: `tsc && vite build` completado exitosamente (código 0).

## 📌 HotFix de Rendimiento: Corrección de Timeout (15s) en Filtro de Fechas de Ventas
- **Rama Git**: `mantenimiento/mejoras-v2`
- **Problema Resuelto**: Al filtrar por fechas en el Histórico de Ventas, la petición tardaba más de 27 segundos en responder, lo que disparaba la cancelación por timeout (15s) en el cliente React ("Tiempo de espera agotado al conectar con el servidor (15s). Verifica la conexión.").
- **Cambios Realizados**:
  - **Backend**:
    - `SaleApplicationService.cs`: Optimización de `GetSalesAsync` separando el conteo `totalItems` a una consulta limpia sin `Include` (< 5 ms) y aplicando paginación en dos fases (recuperación de IDs paginados primero, y posterior hidratación con `.AsSplitQuery()` para evitar explosión cartesiana). El tiempo de base de datos disminuyó de 25,007 ms a ~41 ms.
    - Limpieza de inclusiones redundantes en `GetSalesSummaryAsync`.
    - Inclusión preventiva de `.AsSplitQuery()` en `BuildSaleQuery()`, `BuildQuoteQuery()` y `BuildReturnQuery()`.
  - **Frontend**:
    - `SalesHistoryPage.tsx`: Desacoplamiento de `loadSales` para que opere exclusivamente sobre `appliedFilters` y no sobre las variables de estado reactivas del formulario. Las peticiones ahora se despachan únicamente al hacer clic en "Buscar" / enviar formulario, al limpiar filtros o al cambiar de página / ordenamiento.
- **Validación**:
  - Pruebas automatizadas: Vitest 42/42 pasadas (100%), xUnit 72/72 pasadas (100%).
  - Prueba en navegador real con subagente: Consulta del rango `01/09/2026` a `09/09/2026` respondiendo de inmediato con 17 registros y métricas sin errores.

## 📌 Hito Cumplido: Paginación Server-Side Universal en Todo el PDV (Mejoras v2)
- **Rama Git**: `mantenimiento/mejoras-v2`
- **Implementación Full-Stack**:
  - Backend: Modelo unificado `PagedResult<T>`, clase `PagedRequest.cs` y helper `QueryPaging.cs` aplicando `.Skip((pageNumber - 1) * pageSize).Take(pageSize)` en SQL Server con Entity Framework Core 9.
  - Frontend: Hook reutilizable `usePagination.ts` (con pruebas unitarias), componente de paginación accesible `TablePagination.tsx` y utilidad `loadAllPagesForExport` para exportaciones completas en PDF y Excel.
- **Módulos Integrados (11/11)**:
  1. 🧾 **Histórico de Ventas**: Paginación con métricas globales preservadas.
  2. 💵 **Corte de Turno y Caja**: Paginación dual para historial y movimientos.
  3. 📑 **Cotizaciones**: Paginación server-side con filtros de fecha y estado.
  4. 💳 **Operaciones Comerciales**: Paginación dual para transacciones/abonos y devoluciones.
  5. 📦 **Catálogo de Productos WPC Bajío**: Paginación server-side con filtros por categoría y ordenamiento.
  6. 📁 **Catálogo de Categorías WPC Bajío**: Paginación server-side y búsqueda.
  7. 👥 **Directorio de Clientes**: Paginación server-side con debounce de búsqueda.
  8. 🏭 **Control de Inventarios WPC Bajío**: Paginación server-side con escáner de código de barras.
  9. 📋 **Movimientos de Inventario**: Paginación server-side por fechas y tipo de movimiento.
  10. 👤 **Gestión de Usuarios y Roles**: Paginación server-side de usuarios y gestión de roles.
  11. 🔍 **Bitácora Central de Auditoría**: Paginación server-side con filtros por usuario, módulo y resultado.
- **Suite de Pruebas y Compilación**:
  - Frontend: Vitest 42/42 pasadas (100%), build de producción `tsc && vite build` completado sin errores.
  - Backend: xUnit 72/72 pasadas (100%), `dotnet build` con 0 errores y 0 advertencias.
- **Validación Local**: Sistema levantado y listo para validación por parte del desarrollador humano antes de commit y push.

## 📌 Hito Cumplido: Ordenamiento de Tablas (Table Sorting de 3 Estados)
- **Implementación**: Sistema unificado y tipado con `useTableSort.ts` y `SortableTh.tsx`.
- **Comportamiento**: 1er clic ascendente (↑), 2do clic descendente (↓), 3er clic restablece (⇅).
- **Módulos Integrados**: Histórico de Ventas, Transacciones y Abonos, Catálogo de Productos, Catálogo de Categorías, Control de Inventarios y Movimientos de Inventario.

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
