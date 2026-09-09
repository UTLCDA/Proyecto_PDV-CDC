# CURRENT STATE — Estado Real del Sistema WPC Bajío

## 🟢 ESTADO ACTUAL (Septiembre, 2026)

- **Mantenimiento Catálogo de Productos (Rama `mantenimiento/mejoras-catalogo-productos`)**:
  - **Rama Git Activa**: `mantenimiento/mejoras-catalogo-productos`
  - **Objetivo**: Mejoras al módulo de productos "catálogo" solicitadas por el cliente:
    1. **Identificador Secuencial `IdProducto` (Identity 1-1)**:
       - Incorporado campo `int IdProducto` en entidades de Dominio (`Producto.cs` y `Product.cs`) y DTOs (`ProductDto.cs`, `Producto.ts`, `Product.ts`).
       - Configurado en `PosDbContext.cs` como `ValueGeneratedOnAdd()`, mapeado en SQL Server como columna `IDENTITY(1,1)` con índice único `IX_Products_IdProducto`. El GUID original `Id` permanece intacto como PK/FK.
       - Simulación de identidad automática añadida en `PosDbContext.cs` para el proveedor `InMemory` en suites de pruebas unitarias.
       - Migración EF Core generada: `20260909231411_AddIdProductoIdentityToProducts`.
       - Búsqueda por texto en API ampliada para coincidencia exacta con `IdProducto` si la consulta es numérica.
       - Columna "ID" agregada con ordenamiento interactivo y formato `#{p.idProducto}` en la tabla del catálogo.
    2. **Columna "Inventario Actual"**:
       - Añadida columna "Inventario Actual" en la tabla mostrando las piezas actuales en existencia (`p.availableQuantity`).
       - Insignias visuales de nivel de existencias (suficiente, bajo stock, agotado).
       - Ordenamiento interactivo por existencias (`stock`) soportado tanto en backend como frontend.
    3. **Baja Lógica de Producto (ABC / CRUD Completo)**:
       - Endpoint `DELETE /api/v1/products/{id}` en `ProductsController.cs` protegido por política `Catalog.ProductsEdit`.
       - Lógica de desactivación `EstaActivo = false`, auditoría `PRODUCT_DELETED` en bitácora central y validación de existencia.
       - Filtro `includeInactive` añadido a `GetProductsAsync` (por defecto `false`), permitiendo conmutar entre Activos, Inactivos y Todos en el catálogo.
       - Botón "🗑️ Eliminar" en frontend con diálogo de confirmación y advertencia bilingüe.
    4. **Refinamiento de UI en Catálogo de Productos**:
       - Botones compactos de iconos (32x32px) para `📄 Ficha Técnica`, `✏️ Editar` y `🗑️ Eliminar`, reduciendo el ancho de la celda de acciones de más de 320px a ~110px.
       - Corrección de duplicación de números en inventario: ahora se muestra exclusivamente la cifra de piezas numéricas en el badge (`{p.availableQuantity}`).
    5. **Reordenamiento y Formato Bilingüe Universal de Columnas**:
       - Columna `ID` (`#{p.idProducto}`) reubicada en primera posición, seguida de la columna de `Imagen` (2ª) y `SKU / Código` (3ª).
       - En la columna `SKU / Código`, el SKU se destaca en tipografía grande monospace (`1.15rem`, negrita 800) y el código de barras debajo (`Cod: ...`).
       - Formato bilingüe dual (`Español / 中文`) aplicado al 100% de los encabezados de tabla:
         - `ID / 编号`
         - `Imagen / 图片`
         - `SKU / Código / 编码`
         - `Categoría / 分类`
         - `Precio Menudeo / 零售价`
         - `Precio Mayoreo / 批发价`
         - `Inventario Actual / 当前库存`
         - `Piezas/Caja / 每箱片数`
         - `Cobertura (m²) / 覆盖面积`
         - `Acciones / 操作`
  - **Pruebas y Verificación**:
    - Backend: 77/77 pruebas superadas al 100% (xUnit: Domain, Application, IntegrationTests).
    - Frontend: 47/47 pruebas unitarias de Vitest superadas (100%).
    - Build Frontend: `npm run build` (`tsc && vite build`) completado con 0 errores y 0 advertencias.

- **Despliegue a Producción (Main y VPS Cloud)**:
  - **Rama Git**: `main` (commit `69c9e7b`, sincronizado con `mantenimiento/mejoras-v2`).
  - **Backend en VPS**: Código actualizado desde `main`, compilado en Release y publicado a `/var/www/pos-api/` con `systemctl restart pos-api` (servicio activo y respondiendo 200 OK en `https://api.wpcbajio.com/api/v1/health`).
  - **Frontend en Cloudflare Pages**: Código integrado a `main` para despliegue automático de CDN Edge en `https://pos.wpcbajio.com`.

- **Resolución de Visibilidad de Paginación en Frontend ("No veo la numeración en el front")**:
  - **Rama Git**: `main` / `mantenimiento/mejoras-v2`
  - **Problema Reportado**: Tras la implementación de la paginación numerada, el usuario no visualizaba los números ni la barra de paginación en el frontend.
  - **Causa Raíz Identificada**:
    1. *Serialización en `System.Text.Json` (`PagedResult<T>`)*: La clase `PagedResult<T>` implementaba `IReadOnlyList<T>` e `IEnumerable`. En ASP.NET Core, `System.Text.Json` trata a cualquier tipo que implemente `IEnumerable` como una colección JSON pura (`[...]`), descartando completamente todas las propiedades de objeto (`totalItems`, `totalPages`, `pageNumber`, `pageSize`).
    2. *Recepción en Frontend*: Al recibir un array JSON plano, los componentes web identificaban `Array.isArray(data)` como `true` o no encontraban `totalItems` (era `undefined`), impidiendo que `pagination.setPaginationFromResult` asignara `totalItems`, por lo que `pagination.totalItems` permanecía en `0`.
    3. *Retorno Temprano en `TablePagination.tsx`*: Con `totalItems === 0`, el componente ejecutaba `if (totalItems === 0) return null;`, lo que hacía que el componente completo se desmontara y fuera invisible en la interfaz.
  - **Solución Implementada**:
    1. *Backend (`PagedResult.cs`)*: Se removió la interfaz `IReadOnlyList<T>` e `IEnumerable` de `PagedResult<T>`, manteniendo las propiedades de conveniencia (`Count`, `this[index]`). De este modo, `System.Text.Json` serializa el DTO como un objeto JSON estándar `{ items, pageNumber, pageSize, totalItems, totalPages, hasPreviousPage, hasNextPage }`.
    2. *Controladores y Pruebas Backend*: Se adaptaron los llamados de filtrado en controladores (`QuotesController`, `PaymentsController`, `ReturnsController`) e integración para acceder a `result.Items`, validando que todas las 73 pruebas xUnit pasen al 100%.
    3. *Frontend Resiliente (`usePagination.ts`)*: Se actualizó `setPaginationFromResult` para tolerar tanto camelCase como PascalCase (`totalItems` / `TotalItems`, `totalPages` / `TotalPages`), calculando `totalPages` como respaldo si fuera omitido.
    4. *Visibilidad Permanente (`TablePagination.tsx`)*: Se eliminó el `return null` cuando `totalItems === 0`. Ahora el componente siempre es visible, mostrando "Sin registros" / "暂无数据", el selector de registros por página y los botones de página numerados `[ 1 ]` deshabilitados, garantizando consistencia visual incondicional.
  - **Verificación**:
    - Backend: 73/73 pruebas unitarias y de integración superadas (100% éxito).
    - Frontend: 47/47 pruebas unitarias de Vitest superadas (100% éxito).
    - Build de Producción Frontend: `npm run build` ejecutado en 10.72s con 0 errores y 0 advertencias.

- **Implementación Universal del Componente de Paginación Numerada Reutilizable (`TablePagination`)**:
  - **Rama Git Activa**: `mantenimiento/mejoras-v2`
  - **Objetivo Cumplido**: Estandarización y despliegue del componente reutilizable `TablePagination` en el 100% de las tablas con paginación server-side del sistema.
  - **Funcionalidad y Características**:
    - Paginación numerada inteligente con elipses adaptativas (`1, 2, ..., N` con ventana de 7 botones centrada).
    - Botones de navegación accesibles: Primera página (`«`), Anterior (`‹`), números activos destacados en paleta corporativa WPC Bajío (`#9C4D22`), Siguiente (`›`) y Última página (`»`).
    - Selector integrado de tamaño de página (25, 50, 100 registros por página).
    - Resumen dinámico bilingüe ("Mostrando X a Y de Z registros" / "显示第 X 至 Y 条，共 Z 条").
    - Manejo seguro de handlers `handlePageChange` y `handlePageSizeChange` con validación de límites y deshabilitación durante carga (`disabled={loading}`).
    - Estilos completamente integrados con los tokens CSS del sistema (`--primary-main`, `--border-subtle`, `--background-surface`, `--text-main`, etc.) y responsive design para móviles (< 640px).
  - **Tablas Integradas**:
    1. 🧾 Histórico de Ventas (`SalesHistoryPage.tsx`)
    2. 💳 Operaciones Comerciales: Transacciones, Abonos y Devoluciones (`CommercialOpsPage.tsx`) — Se corrigió la ausencia del paginador en la vista de transacciones.
    3. 💵 Corte de Turno y Caja: Movimientos de Caja e Historial de Turnos (`CashShiftPage.tsx`)
    4. 📦 Catálogo de Productos (`PaginaCatalogoProductos.tsx`)
    5. 📁 Catálogo de Categorías (`CategoryListPage.tsx`)
    6. 👥 Directorio de Clientes (`CustomerListPage.tsx`)
    7. 🏭 Control de Inventarios (`InventoryListPage.tsx`)
    8. 📋 Movimientos de Inventario (`InventoryMovementsPage.tsx`)
    9. 📑 Cotizaciones (`QuoteListPage.tsx`)
    10. 👤 Gestión de Usuarios (`PaginaUsuarios.tsx`)
    11. 🔍 Bitácora Central de Auditoría (`AuditLogPage.tsx`)
  - **Pruebas y Compilación**:
    - Backend: 72/72 pruebas pasadas (100% xUnit: Domain, Application, IntegrationTests).
    - Frontend: Compilación de producción `npm run build` (`tsc && vite build`) completada con 0 errores.
    - Pruebas Unitarias Frontend: Suite para `getPageNumbers` añadida en `usePagination.test.ts`.

- **Optimización Integral de Paginación y Filtros en Todos los Módulos Paginados (Mejoras v2 - Fase 2)**:
  - **Rama Git Activa**: `mantenimiento/mejoras-v2`
  - **Objetivo Cumplido**: Extensión universal de la arquitectura de alto rendimiento (conteo puro, paginación de dos fases por IDs con `.AsSplitQuery()` y desacoplamiento de filtros con `appliedFilters`) a TODOS los módulos del sistema PDV.
  - **Módulos Optimizados en Backend y Frontend**:
    1. 📑 **Cotizaciones** (`CommercialOperationsService.cs`, `QuoteListPage.tsx`): Paginación en dos fases, `.AsSplitQuery()`, filtros desacoplados con botón de limpiar y caching de opciones.
    2. 💳 **Operaciones Comerciales** (`CommercialOperationsService.cs`, `CommercialOpsPage.tsx`): Desacoplamiento de carga estática de dropdowns respecto a la paginación, filtros de transacciones/abonos independientes, dos fases con `.AsSplitQuery()` en devoluciones y abonos.
    3. 📦 **Catálogo de Productos** (`CatalogApplicationService.cs`, `PaginaCatalogoProductos.tsx`): Paginación de IDs para evitar carga de imágenes en `Skip/Take`, `.AsSplitQuery()` de imágenes, filtros desacoplados y botón de limpiar filtros.
    4. 📁 **Catálogo de Categorías** (`CatalogApplicationService.cs`, `CategoryListPage.tsx`): Conteo limpio sin subcategorías, selección de IDs, hidratación con `.AsSplitQuery()`, eliminación de filtro redundante en cliente.
    5. 👥 **Directorio de Clientes** (`CatalogApplicationService.cs`, `CustomerListPage.tsx`): `AsNoTracking()`, soporte de `includeInactive`, eliminación del temporizador de 250ms por tecla a favor de `appliedFilters` con botón de búsqueda y limpiar.
    6. 🏭 **Control de Inventarios** (`InventoryApplicationService.cs`, `InventoryListPage.tsx`): Conteo desacoplado de productos/categorías, paginación por ID con `.AsSplitQuery()`.
    7. 📋 **Movimientos de Inventario** (`InventoryApplicationService.cs`, `InventoryMovementsPage.tsx`): Paginación de IDs sin join inicial de productos, `.AsSplitQuery()`, filtros desacoplados de fecha y tipo.
    8. 💵 **Corte de Turno y Caja** (`CashShiftApplicationService.cs`, `CashShiftPage.tsx`): Conteo limpio sin transacciones anidadas, selección en 2 fases con `.AsSplitQuery()`.
    9. 👤 **Usuarios y Roles** (`UserApplicationService.cs`, `PaginaUsuarios.tsx`): Conteo sin roles en la fase 1, dos fases con `.AsSplitQuery()`.
    10. 🔍 **Bitácora de Auditoría** (`ReportingApplicationService.cs`, `AuditLogPage.tsx`): Conteo limpio sin usuario, paginación de IDs con `.AsSplitQuery()`, filtros desacoplados con botón de limpiar.
  - **Estado de Pruebas**:
    - Backend: 72/72 pruebas pasadas (100% xUnit: Domain, Application e IntegrationTests), compilación `dotnet build` sin errores ni advertencias.
    - Frontend: Compilación de producción `npm run build` (`tsc && vite build`) completada con éxito (código de salida 0).

- **HotFix de Rendimiento — Corrección de Timeout (15s) en Rango de Fechas de Ventas**:
  - **Rama Git Activa**: `mantenimiento/mejoras-v2`
  - **Problema Reportado**: Al consultar un rango de fechas en el módulo de ventas (ej. `2026-09-01` a `2026-09-09`), el cliente web abortaba con `"Tiempo de espera agotado al conectar con el servidor (15s). Verifica la conexión."` debido a que la petición tardaba más de 27 segundos en responder.
  - **Causa Raíz Diagnosticada**:
    1. *Explosión Cartesiana en EF Core*: `GetSalesAsync` llamaba a `query.CountAsync()` sobre `BuildSaleQuery()` que incluía múltiples colecciones (`Abonos` y `Partidas`). Al paginar sin `.AsSplitQuery()`, EF Core generaba un SQL masivo con 4 subconsultas `LEFT JOIN` hacia tablas hijas, forzando a SQL Server a computar un producto cartesiano que demoraba 25,007 ms (25 segundos) en ejecutarse.
    2. *Sobredisparo en Frontend*: En `SalesHistoryPage.tsx`, el hook `loadSales` dependía directamente de las variables de estado de los inputs (`startDate`, `endDate`, `search`, `status`), disparando múltiples peticiones concurrentes a la API en cada cambio intermedio del selector de fecha.
  - **Solución Implementada**:
    1. *Backend (`SaleApplicationService.cs`)*:
       - Cálculo de `totalItems` con `CountAsync()` sobre la consulta base pura sin `.Include()` (< 5 ms).
       - Paginación en dos etapas de alto rendimiento: primero se seleccionan únicamente los `Id`s paginados con `Skip(skip).Take(take).Select(s => s.Id)` (< 5 ms), y luego se obtienen las entidades completas con `.AsSplitQuery()` (< 40 ms), eliminando el producto cartesiano. El tiempo de base de datos disminuyó de 25,007 ms a ~41 ms (reducción de más del 99.8%).
       - Optimización de `GetSalesSummaryAsync` eliminando inclusiones redundantes.
       - Adición de `.AsSplitQuery()` a `BuildSaleQuery()`, `BuildQuoteQuery()` y `BuildReturnQuery()` para proteger consultas individuales y listados comerciales.
    2. *Frontend (`SalesHistoryPage.tsx`)*:
       - Desacoplamiento de `loadSales` de los inputs crudos: ahora consume el estado `appliedFilters`, activándose únicamente al enviar el formulario (Buscar), al pulsar Limpiar filtros o al navegar de página/ordenar columnas.
  - **Validación y Pruebas**:
    - Backend: 72/72 pruebas pasadas (100% xUnit: Domain, Application e IntegrationTests), 0 errores y 0 advertencias de compilación.
    - Frontend: 42/42 pruebas pasadas (100% Vitest), compilación de producción `tsc && vite build` completada sin errores.
    - Prueba E2E en Navegador: El agente de navegador consultó el rango exacto `01/09/2026` a `09/09/2026` en `http://localhost:5173`, obteniendo las 17 transacciones y métricas en pantalla de forma inmediata sin errores.

- **Mantenimiento y Mejora — Paginación Server-Side Universal en Todo el PDV (Mejoras v2)**:
  - **Rama Git Activa**: `mantenimiento/mejoras-v2`
  - **Objetivo Cumplido**: Implementación universal de paginación server-side (25 por página por defecto, opciones de 25, 50 y 100) en todos los módulos con tablas o listados para evitar consultas masivas a la API y sobrecarga en SQL Server.
  - **Módulos Integrados**:
    1. 🧾 **Histórico de Ventas** (`SalesHistoryPage.tsx`): Paginación server-side con preservación de métricas globales (`getSalesSummary`).
    2. 💵 **Corte de Turno y Caja** (`CashShiftPage.tsx`): Paginación para historial de turnos y movimientos de caja.
    3. 📑 **Cotizaciones** (`QuoteListPage.tsx`): Paginación server-side con filtros de fecha y estado.
    4. 💳 **Operaciones Comerciales** (`CommercialOpsPage.tsx`): Paginación independiente para transacciones, abonos y devoluciones.
    5. 📦 **Catálogo de Productos WPC Bajío** (`PaginaCatalogoProductos.tsx`): Paginación server-side, búsqueda, filtro por categoría y ordenamiento.
    6. 📁 **Catálogo de Categorías WPC Bajío** (`CategoryListPage.tsx`): Paginación server-side con búsqueda y estado.
    7. 👥 **Directorio de Clientes** (`CustomerListPage.tsx`): Paginación server-side con debounce en búsqueda y filtros.
    8. 🏭 **Control de Inventarios WPC Bajío** (`InventoryListPage.tsx`): Paginación server-side, filtro de existencias bajas y escáner de código de barras.
    9. 📋 **Movimientos de Inventario** (`InventoryMovementsPage.tsx`): Paginación server-side por tipo de movimiento y rango de fechas.
    10. 👤 **Gestión de Usuarios y Roles** (`PaginaUsuarios.tsx`): Paginación server-side de usuarios y gestión de roles/permisos.
    11. 🔍 **Bitácora Central de Auditoría** (`AuditLogPage.tsx`): Paginación server-side con filtros de usuario, módulo y resultado.
  - **Exportación Completa**: Función `loadAllPagesForExport` descarga todas las páginas filtradas para PDF y Excel sin truncar los reportes al tamaño de la página activa.
  - **Suite de Pruebas y Compilación**:
    - Frontend: Vitest 42/42 pasadas (100%), Build de producción `tsc && vite build` completado sin errores.
    - Backend: xUnit 72/72 pasadas (100%), Build `dotnet build` con 0 errores y 0 advertencias.

- **Mantenimiento y Mejora — Ordenamiento de Columnas en Tablas (Table Sorting de 3 Estados)**:
  - **Módulos Integrados**: Histórico de Ventas, Histórico de Transacciones, Catálogo de Productos, Catálogo de Categorías, Control de Inventarios y Movimientos de Inventario.
  - **Comportamiento Operativo**: Clic 1 = Ascendente (`↑`), Clic 2 = Descendente (`↓`), Clic 3 = Sin orden / Restablecer (`⇅`).
  - **Infraestructura**: Hook reutilizable `useTableSort.ts`, componente accesible `SortableTh.tsx`.

- **Despliegue Global Cloudflare & VPS Cloud**: **100% OPERATIVO EN PRODUCCIÓN**
  - **Frontend SPA (Cloudflare Workers/Pages CDN)**:
    - **URL Producción**: `https://pos-wpcbajio.aaronarenasmartinez.workers.dev` / `https://pos.wpcbajio.com`
    - **Tecnología**: React 18, Vite 6.4.3, TypeScript, Wrangler Assets con enrutamiento nativo SPA.
    - **Validación**: Inicio de sesión autenticado, emisión y renovación de tokens JWT, navegación fluida sin recargas.
  - **Backend API (.NET 9 Web API en VPS Ubuntu 26.04 - 193.46.198.88)**:
    - **URL Producción**: `https://api.wpcbajio.com/api/v1`
    - **Servicio Systemd**: `pos-api.service` activo en segundo plano (`active (running)`).
    - **Proxy Inverso**: Nginx 1.28 con reenvío de encabezados para Cloudflare y límite de carga de 50MB.
    - **Seguridad**: Firewall UFW activo (puertos 22, 80, 443).
  - **Base de Datos Central Unificada (SQL Server 2022 Express en Docker)**:
    - **Motor**: Contenedor oficial `mcr.microsoft.com/mssql/server:2022-latest` con persistencia en `/var/opt/mssql`.
    - **Base de Datos**: `PosLambrinDb` con 26 tablas físicas autoritativas, roles (`Administrador`, `Cajero`), 27 permisos y semillas de inicio.
    - **Credencial**: `wpcadminaam` conectando internamente a `localhost:1433`.

- **HotFix Integrado — Carga de Imágenes HEIC, Compresión Canvas y Edición de Productos**:
  - **Soporte de Formato HEIC/HEIF de iPhone**: Integración de conversión bajo demanda con `heic2any` (lazy-loading por importación dinámica) que transforma automáticamente archivos `.heic` a `.jpeg` de forma transparente.
  - **Eliminación del Bloqueo Estricto de 2 MB**: Sustituido el límite estricto de 2 MB por compresión y redimensionamiento automático en cliente mediante `HTMLCanvasElement` (máx. 1200px, calidad 82%). Fotos pesadas de 5 MB a 20 MB se optimizan instantáneamente a un Base64 de ~100–250 KB, evitando sobrecargar la memoria y la base de datos.
  - **Edición y Reemplazo de Imagen en Productos Existentes**: En `PaginaCatalogoProductos.tsx`, habilitada la visualización clara de la foto actual al editar, botón para cambiar imagen (soporta cualquier formato/peso) y botón de eliminación ("✕ Quitar foto").
  - **Optimización en Módulo de Inventarios**: En `InventoryListPage.tsx`, se aplicó el mismo motor de compresión y soporte HEIC para la fotografía de evidencia física en movimientos de inventario.
  - **Suite de Pruebas**: Backend xUnit 56/56, Frontend Vitest 27/27 pasadas.

## Iteración Final aprobada — Release PR "version-final-de-PR" (2026-08-28)

- **Rama Git Activa**: `version-final-de-PR` (creada a petición explícita del cliente para entregables finales).
- **Módulo Punto de Venta (PDV)**:
  - Botones de selección rápida renombrados a `Pieza +` (1 pieza) y `Caja +` (1 caja = `piecesPerBox` piezas).
  - Buscador en tiempo real de tarjetas de catálogo arriba de `📦 Catálogo rápido`.
  - Habilitado rol Cajero (`rolCajero`) para registrar clientes nuevos desde caja (`clientes:crear`) con restricción estricta de no edición (`clientes:editar`).
  - Desglose visual de piezas y cajas en el carrito de compras (ej. `23 Pzas (2 Cjas + 3 Pzas) · $290.00 · 10.01 m²`).
  - Corrección del cálculo de Cobertura en carrito y totales para que multiplique por la cobertura individual por pieza (`coveragePerUnitSqM`).
  - Integración de **📐 Calculadora Modal de m² de Lambrín** mediante el botón `📐 Calculadora m²` en la sección de cobro (`pos-checkout`), con ventana modal flotante, desglose de piezas necesarias/cajas equivalentes y adición al carrito en 1 clic.
  - Imágenes de productos en catálogo rápido ampliadas a 92px.
- **Módulo Catálogo de Productos y Movimientos**:
  - Inclusión del campo `Costo Neto / Inicial ($ MXN)` (`unitCost`) en la Sección 3 del modal de Alta/Edición de Productos.
  - Persistencia full-stack de `CostoUnitario` en SQL Server y APIs del backend.
  - Alimentación directa de las columnas de Costo Neto (COGS) y Ganancia en la tabla de Movimientos de Inventario.
  - Cabeceras bilingües en la tabla del catálogo (`Precio Menudeo / 零售价` y `Precio Mayoreo / 批发价`) e insignias visuales de cobertura (`📐 X.XXX m²/pza` y `📦 Caja: X.XX m²`).
- **Módulo Clientes y Permisos de Usuarios**:
  - Permiso `clientes:limite_diario` para configurar un límite máximo diario de cajas vendidas por cliente.
  - Modales de cliente en PDV y Directorio de Clientes adaptados con campo de Límite Diario de Cajas.
  - Validación autoritativa en `SaleApplicationService` que verifica el límite acumulado de ventas del día antes de autorizar la transacción.
  - Modal de **Historial de Compras de Cliente** disponible en la lista de clientes.
- **Módulo de Movimientos de Inventario y Reportería**:
  - Cancelación de Ventas exclusiva para Administradores (`ventas:cancelar`) desde el Historial de Ventas con restitución automática de existencias, bitácora de auditoría y recalculo del esperado en el Corte de Caja.
  - Formato limpio de folios operacionales 1 a 1: Columna Motivo en Movimientos muestra `Venta #X` en lugar de GUID. Folios de turno de caja muestran `CAJA-YYYYMMDD-1` (secuencial incremental diario) en la tarjeta principal (`cash-card`), tabla de historial y bitácora de auditoría.
  - Columnas financieras en Movimientos de Inventario: Costo Actual (`unitCost`), Precio Actual de Venta (`unitPrice`), Monto de Pago (`totalAmount`), Impuesto (`taxAmount`), Costo Neto / COGS (`netCost`) y Ganancia (`profit`).
  - Corrección del fallback de IVA: ventas no facturadas muestran `$0.00` de impuesto.
  - Exportaciones PDF y Excel con 100% de encabezados bilingües en **Español y Chino Simplificado** con registro singleton de fuentes CJK (`Noto Sans SC`) para generación ultrarrápida y sin caracteres garabateados.
- **Suite de Pruebas y Compilación**:
  - Backend (xUnit): **67/67 pruebas autoritativas pasadas al 100%**.
  - Frontend (Vitest & Vite): **24/24 pruebas pasadas al 100%**, build de producción `tsc && vite build` ejecutado exitosamente en `dist/`.
  - Migración EF Core versionada: `20260828020937_AddCustomerDailyLimitAndProductCost`.

## Iteración aprobada — Pie de Comprobante WPC Bajío, Corrección de CI y Sincronización de Puertos (2026-08-18)

- **Diseño e Integración del Pie de Comprobante (Ticket / Recibo)**:
  - Estructuración pulida del pie de comprobante en `SaleReceiptModal.tsx` con la identidad institucional WPC BAJÍO.
  - Inclusión de mensaje de agradecimiento (*¡GRACIAS POR SU COMPRA!*), atención a clientes (Tel/WhatsApp: *477 807 2768*), dirección física (*Blvd. Adolfo López Mateos 2826, El Rosario, C.P. 37125, León de los Aldama, Gto.*) e insignia `PRÓXIMAMENTE` (*www.wpcbajio.com*).
  - Reglas de impresión `@media print` en `PaginaPuntoVenta.css` optimizadas para rollo continuo de 80mm/58mm en impresoras térmicas y PDF sin recortes de altura (`@page { size: auto; margin: 0; }` y `page-break-inside: auto !important`).

- **Estabilización de Pipeline CI (GitHub Actions Linux) y Alineación de Puertos**:
  - Creación de `src/backend/Pos.sln` con rutas relativas multiplataforma (`/`) compatibles con Linux (`ubuntu-latest`).
  - Implementación de `CustomWebApplicationFactory` para pruebas de integración 100% in-memory sin dependencia de servidor SQL local en la nube.
  - Alineación de puertos de desarrollo en `launchSettings.json` y `vite.config.ts` (`http://localhost:60931` / `http://localhost:5000`).
  - Suite de pruebas 100% verde: **67/67 pruebas backend** (xUnit) y **24/24 pruebas frontend** (Vitest).

## Iteración aprobada — Bitácora Central de Auditoría y Base de Datos Limpia de Producción (2026-08-18)

- **Rediseño del Módulo de Auditoría / Bitácora Central del Sistema**:
  - Transformación integral del módulo de auditoría de una vista técnica hacia un **Historial de Actividades Ejecutivas / Auditoría Central** (QUIÉN + QUÉ HIZO + DÓNDE + CUÁNDO + SOBRE QUÉ + RESULTADO).
  - Enriquecimiento JSON estructurado (`schemaVersion: 1`, `module`, `eventType`, `resultStatus`) y desinfección en backend de campos sensibles (`password`, `token`, `secret`, `cvv`) mediante expresiones regulares.
  - Filtro preventivo en `AuditMiddleware`: se omiten registros masivos HTTP `GET 200 OK` en la tabla `AuditLogs`, reservando la tabla de auditoría para eventos de dominio y errores HTTP (`StatusCode >= 400`).
  - Interfaz ejecutiva con íconos por módulo (🛒 Ventas, 📦 Productos, 👥 Clientes, 🏭 Inventario, 💵 Caja, 💰 Pagos, 📑 Cotizaciones, ↩️ Devoluciones, 👤 Usuarios, 🛡️ Roles, 🔒 Seguridad, ⚙️ Sistema), badges de resultado (Correcto, Advertencia, Error) y modal/drawer con acordeón técnico contraído por defecto.
  - Eliminación del botón redundante `📜 Bitácora del Sistema` del navbar en `App.tsx` y desactivación del sink `InMemory` de Serilog.
  - Pruebas unitarias de frontend (`auditMapper.test.ts`) agregadas y 100% aprobadas en Vitest (24/24).

- **Generación de Base de Datos Limpia para Cierre de Fase 1 (`PosLambrinDb`)**:
  - Recreación estandarizada y limpia de la base de datos `PosLambrinDb` en SQL Server `AAM`.
  - Aplicación completa del DDL con 26 tablas, claves primarias, claves foráneas e índices mediante `clean_init.sql`.
  - Registro de las 10 migraciones de EF Core en la tabla `__EFMigrationsHistory`.
  - Población automática autoritativa mediante `DbInitializer`: 2 Roles (`Administrador`, `Cajero`), 27 Permisos, 30 Asignaciones `RolPermiso`, 1 Empleado y Usuario `admin` (`admin@lambrin.com` / `Admin123!`), y 1 Cliente (`Público en General`).
  - Todas las tablas transaccionales y de catálogo (`Sales`, `Products`, `Stocks`, `AuditLogs`, `CashShifts`, `CashTransactions`, `Quotes`, `ReturnHeaders`, `PaymentInstallments`) quedan limpias en 0 registros.

## Iteración aprobada — Exportación administrativa PDF/Excel e Integración a Main (2026-08-17)

- **Ajustes visuales posteriores a validación humana**:
  - Histórico de Ventas separa encabezado/exportación de la fila de filtros y adapta sus controles sin compresión.
  - Histórico de Transacciones elimina el número aislado de registros que resultaba ambiguo junto a las exportaciones.
  - Directorio de Clientes utiliza todo el ancho disponible y distribuye buscador, estado, alta y exportación mediante grid responsive.
  - Alta/edición de Usuarios muestra errores dentro del modal y una lista dinámica de requisitos de contraseña; cada requisito cambia a verde al cumplirse y el guardado permanece deshabilitado mientras falte alguno.
  - Movimientos de Inventario agrupa las fechas bajo “Periodo del movimiento” y muestra etiquetas visibles para Fecha inicial/Fecha final, con disposición responsive.
- **Ramas Git & Publicación en GitHub**:
  - `origin/main`, `origin/fase-1.1` y `origin/codex/exportacion-pdf-excel` integradas en `3fbc641`.
  - Nueva rama activa de trabajo creada desde `main`: `codex/2.1.0-fix-interaccion-bitacora` (publicada en `origin/codex/2.1.0-fix-interaccion-bitacora`).
- **Infraestructura reutilizable**: `ExportButtons`, generador PDF con `@react-pdf/renderer`, generador XLSX con `ExcelJS`, contrato tipado de columnas/filtros y carga paginada común.
- **Cobertura funcional**: ventas, clientes, productos, existencias, movimientos de inventario, cotizaciones, abonos, transacciones/pagos, devoluciones, caja, reportes, usuarios, roles y auditoría.
- **Archivos profesionales**: logo oficial, identidad WPC Bajío, filtros realmente aplicados, tabla multipágina en PDF, valores tipados/autofiltro/freeze en Excel y nombres derivados del periodo activo.
- **Conjunto completo**: los listados paginados se recuperan en lotes de 500; no se limita la exportación a la página visible. Los límites preventivos son 10,000 filas para PDF y 50,000 para Excel, con solicitud explícita de acotar filtros al excederlos.
- **Compatibilidad**: los parámetros API `page` y `pageSize` son opcionales; no se cambiaron rutas, permisos, esquema SQL, PK/FK, GUID técnicos ni la generación de `IdVenta`.
- **Fecha operativa**: los filtros de periodo inician con el día actual de `America/Mexico_City` y los reportes usan los últimos filtros consultados.
- **Aprobación humana y Fusión a Main**: los cambios fueron validados y fusionados directamente a `origin/main` y `origin/fase-1.1`.
- **Validación automatizada final**: backend **67/67**, frontend **21/21**, build Release .NET con **0 advertencias / 0 errores**, build Vite exitoso y auditoría de dependencias de producción con **0 vulnerabilidades**.
- **Documentación técnica**: `docs/ai/EXPORTACION_PDF_EXCEL.md` y borrador de PR `docs/ai/PR_EXPORTACION_PDF_EXCEL.md`.

## Liberación Oficial — Versión 2.0.0 (Fase 1 Comprobada y Validada)

- **Versión**: `2.0.0`
- **Línea Base Git**: `main`, `fase-1.1` y `codex/exportacion-pdf-excel` alineadas en `726faae`.
- **Cálculo Transparente de IVA**: El IVA del 16% en ventas y cotizaciones se calcula sobre el Subtotal base de productos sin ser reducido por descuentos de venta/cliente (`MontoIva = SubTotal * 0.16`). El descuento se aplica directamente al Total a Pagar.
- **Hora de Inserción y Zona Horaria Local**: Las propiedades `DateTime` se expresan en ISO 8601 UTC con sufijo `'Z'` (`UtcDateTimeJsonConverter`) y la aplicación frontend convierte automáticamente la fecha/hora a la hora local del usuario en Guadalajara (−06:00 CT, ej. 02:35 AM), sin alterar registros existentes en la BD.
- **Tabla de Amortización de Abonos e Histórico Transaccional (`commercial-global-history`)**:
  - `GetInstallmentHistoryAsync`, `GetInstallmentsBySaleReferenceAsync` y `GetPaymentTransactionsAsync` incluyen `.Include(item => item.Abonos)` en backend para descontar de forma autoritativa los abonos registrados y calcular el valor exacto del Anticipo Inicial ($6.00).
  - Venta #47 en la tabla de abonos refleja la amortización exacta:
    - **Registro 1 (Anticipo Inicial)**: Monto Abonado **$6.00**, Saldo Pendiente resultante **$400.00** (`$406.00 - $6.00`).
    - **Registro 2 (Abono a Saldo)**: Monto Abonado **$99.00**, Saldo Pendiente resultante **$301.00** (`$400.00 - $99.00`).
- **Regla `<HistoricoAbonosCorrectoComprobante>` por Auditoría**:
  - `SaleReceiptModal` realiza un filtrado por `targetPaymentId` y slicing de arreglo (`sorted.slice(0, targetIdx + 1)`).
  - Al abrir "👁️ Comprobante" en la fila del 1° abono (Anticipo Inicial), el recibo muestra únicamente los **$6.00** del anticipo inicial y saldo pendiente de **$400.00**.
  - Al abrir "👁️ Comprobante" en la fila del 2° abono ($99.00), muestra el desglose del Anticipo ($6.00) + Abono ($99.00) y saldo pendiente de **$301.00**.
  - La tabla dedicada de **Histórico de Transacciones y Movimientos de Pago** propaga ahora el identificador y la fecha del movimiento seleccionado mediante `paymentReceiptArguments`; la Venta #49 a las 02:14 muestra sólo el anticipo de **$42.83** y saldo histórico de **$1,000.01**, mientras que la fila de las 02:42 incluye además el abono posterior de **$10.00** y saldo de **$990.01**.
- **Directorio de Clientes**:
  - Campo de teléfono validado estrictamente a sólo números.
  - Formulario de dirección reordenado solicitando primero el CP y autocompletando Ciudad y Estado mediante `servicioCodigoPostal.ts` (catálogo estandarizado de municipios de Guanajuato y México).
- **Validación actual (2026-08-17)**: backend **67/67** (Domain 19, Application 36, Integration 12); build Release .NET **0 advertencias / 0 errores**; frontend build Vite exitoso; Vitest **21/21**.

## Estado de la aplicación

- **Línea base Git**: rama `fase-1.1`, con la corrección del comprobante histórico integrada sobre la base previa `6c68549`.
- **Módulos operativos independientes en navegación principal**:
  - 🛒 **Punto de Venta (PDV)** (validación estricta de caja aperturada antes de procesar ventas, selector de cliente obligatorio en apartado/anticipo, botones `+`/`-` con incremento entero).
  - 🧾 **Histórico de Ventas** (búsqueda, filtros por fecha/estado/cliente y reimpresión de comprobante).
  - 💵 **Control de Caja** (apertura, sangrías, ingreso de dinero/ajuste de cambio, Corte X, Corte Z, resumen de movimientos generales e íconos representativos).
  - 📈 **Reportes Ejecutivos** (indicadores reales con fechas por defecto del día actual, íconos por método de cobro y tabla detallada de productos con stock bajo).
  - 📑 **Cotizaciones** (omisión de Público General, miniatura de producto e incremento `+`/`-`).
  - 💰 **Abonos y Saldos Pendientes** (histórico global de abonos desglosado con anticipo inicial).
  - 💳 **Transacciones** (tabla dedicada de cobros, abonos e historial transaccional).
  - ↩️ **Devoluciones** (módulo posventa independiente con restitución transaccional de stock).
  - 📄 **Plantillas de Contratos A4** (gestor de plantillas contractuales e impresión).
  - 📦 **Catálogo de Productos** (SKU `WPC-`, mayoreo y existencias en tiempo real).
  - 🏭 **Inventario y Existencias** (stock dinámico actual en captura de movimientos, ubicación fija `Bodega Adolfo Lopez Mateos`).
  - 📋 **Movimientos de Inventario** (historial trazable con evidencia física e imágenes).
  - 👥 **Directorio de Clientes** (estatus activo/inactivo, filtros y checkbox administrado por rol Admin).
  - 🛡️ **Usuarios y Roles** (matriz de 24 permisos).
  - 🔍 **Auditoría / Bitácora** (explorador independiente de eventos auditados).
- **Rol Cajero**: conserva únicamente `ventas:procesar`, `catalogo:productos_ver` y `clientes:ver`; las dos lecturas son dependencias del PDV y no muestran módulos restringidos en el menú.
- **Autorización**: menú y acciones se derivan de permisos vigentes; API y frontend aplican permisos granulares.

## Identidad visual WPC Bajío

- El frontend utiliza un tema claro único basado en la paleta oficial: fondo `#FAF8F5`, superficies blancas, contenedores crema, primario terracota `#9C4D22`, texto café y bordes arena.
- Los tokens de color, estados, sombras, radios y alias de compatibilidad están centralizados en `src/frontend/pos-web/src/index.css`.
- El logo de `public/logo_wpc_bajio.jpeg` aparece en inicio de sesión y encabezado.
- Se optimizaron las reglas `@media print` en `PaginaPuntoVenta.css` para tickets térmicos de 80mm eliminando páginas en blanco mediante `page-break-inside: avoid`.

## Operación comercial

- **Ventas**: validación de caja aperturada requerida antes de completar ventas; anticipo exige cliente real; folios transaccionales únicos. El guardado relacional inserta la venta una sola vez, recupera desde SQL Server el `IdVenta` generado por el GUID de la venta y lo propaga a partidas y movimientos mediante actualizaciones directas dentro de la misma transacción reintentable.
- **Caja**: módulo con métricas ilustradas (💵 Efectivo, 💳 Tarjeta, 🏦 SPEI, 💸 Sangrías), modal de confirmación en sangrías que superan el saldo en caja, y función de ingreso de dinero para ajuste de cambio.
- **Clientes**: estatus visible, filtros de bajas y checkbox administrado exclusivamente por rol Admin.
- **Cotizaciones**: cliente obligatorio (omite público general), cantidades enteras con `+`/`-` y miniatura del producto.
- **Inventario**: stock actual mostrado dinámicamente al seleccionar producto en captura de movimientos; ubicación fija read-only.

## Base de datos

- **Motor**: SQL Server `AAM`, base `PosLambrinDb`, Windows Authentication.
- **Migraciones registradas y físicamente verificadas en la base operativa**:
  - `20260804135557_AddInventoryMovementEvidenceImage`
  - `20260805071520_RestrictCashierToPointOfSale`
  - `20260805085801_AddUniqueOperationalFolios`
  - `20260805092442_CompleteCommercialOperations`
  - `20260805095319_CompleteReportsAndCatalog`
  - `20260805095914_NormalizeDefaultWarehouseLocation`
  - `20260809223936_AddCashShiftTotalEntradas`
  - `20260810111538_AddIdVentaOperationalFolio`
  - `20260810123707_BackfillOperationalSaleReferences`
  - `20260810131157_StandardizeReceiptReferencesByIdVenta`, aplicada por EF Core con 11 recibos y 8 movimientos de caja normalizados.
- `__EFMigrationsHistory` está alineado hasta `20260810131157` en `AAM/PosLambrinDb`. Sigue pendiente una migración inicial completa para construir el esquema desde una base totalmente vacía.

## Validación ejecutada (2026-08-10 - Rama `fase-1.1`)

- **Backend xUnit**: **65/65** aprobadas al 100% (18 dominio, 35 aplicación, 12 integración).
- **Backend build Release**: solución `src/backend/Pos.slnx`, **0 advertencias / 0 errores**.
- **Frontend Vitest**: **10/10** aprobadas al 100%.
- **Frontend producción**: `tsc && vite build`, exitoso sin errores (88 módulos transformados).
- **🆔 Folio Operativo `IdVenta`**: Incorporación aditiva y retrocompatible del identificador consecutivo numérico `IdVenta` (`INT IDENTITY(1,1)` en `Sales` e `INT NULL` en `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements`, `CashTransactions`).
  - Mantenidos al 100% los identificadores GUID `Id`, PKs y FKs sin reemplazos ni refactorizaciones masivas.
  - Concurrencia segura gestionada autoritativamente por SQL Server IDENTITY.
  - Generación de nuevo endpoint `GET /api/v1/sales/folio/{idVenta:int}` manteniendo intacto `GET /api/v1/sales/{id:guid}`.
  - Visualización uniforme en historial y comprobante de venta (`Venta #157`).
  - Corregido el doble `SaveChangesAsync(false)` que provocaba reinserciones con GUID duplicados al propagar el folio operativo.
  - Corregida la lectura prematura de `sale.IdVenta`: con `SaveChangesAsync(false)` el valor generado puede permanecer diferido; ahora se consulta en SQL Server dentro de la transacción antes de propagarlo.
  - MARS deshabilitado en la conexión operativa para conservar los savepoints de EF Core.
  - Prueba automatizada confirma que consultar una venta por GUID y por `IdVenta` devuelve la misma operación.

## Validación humana de la corrección transaccional

- La corrección de persistencia fue validada por el desarrollador humano antes de esta iteración: venta creada correctamente, sin reinserciones, sin registros parciales y con `IdVenta` generado por SQL Server.

## Pendientes reales de Fase 1

- Incorporar una **migración inicial/baseline reproducible** para construir `PosLambrinDb` desde una base SQL Server completamente vacía.
- Diseñar e implementar **Promociones** con reglas de acumulación/prioridad.
- Diseñar **Entregas/Envíos** y su flujo de estados.
