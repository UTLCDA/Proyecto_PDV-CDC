# CURRENT STATE — Estado Real del Sistema WPC Bajío

## Estado de la aplicación

- **Línea base Git**: rama `fase-1.1`, commit `b6fa99f` (v1.3.1). Existe una corrección local pendiente de commit y validación humana para el guardado transaccional de ventas con `IdVenta`.
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
- **Migraciones aplicadas y verificadas**:
  - `20260804135557_AddInventoryMovementEvidenceImage`
  - `20260805071520_RestrictCashierToPointOfSale`
  - `20260805085801_AddUniqueOperationalFolios`
  - `20260805092442_CompleteCommercialOperations`
  - `20260805095319_CompleteReportsAndCatalog`
  - `20260805095914_NormalizeDefaultWarehouseLocation`
  - `20260809223936_AddCashShiftTotalEntradas`
  - `20260810111538_AddIdVentaOperationalFolio`

## Validación ejecutada (2026-08-10 - Rama `fase-1.1`)

- **Backend xUnit**: **57/57** aprobadas al 100% (12 dominio, 33 aplicación, 12 integración).
- **Backend build Release**: solución `src/backend/Pos.slnx`, **0 advertencias / 0 errores**.
- **Frontend Vitest**: **8/8** aprobadas al 100%.
- **Frontend producción**: `tsc && vite build`, exitoso sin errores (88 módulos transformados).
- **🆔 Folio Operativo `IdVenta`**: Incorporación aditiva y retrocompatible del identificador consecutivo numérico `IdVenta` (`INT IDENTITY(1,1)` en `Sales` e `INT NULL` en `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements`, `CashTransactions`).
  - Mantenidos al 100% los identificadores GUID `Id`, PKs y FKs sin reemplazos ni refactorizaciones masivas.
  - Concurrencia segura gestionada autoritativamente por SQL Server IDENTITY.
  - Generación de nuevo endpoint `GET /api/v1/sales/folio/{idVenta:int}` manteniendo intacto `GET /api/v1/sales/{id:guid}`.
  - Visualización formateada en historial y comprobante de venta (`Folio #00000157`).
  - Corregido el doble `SaveChangesAsync(false)` que provocaba reinserciones con GUID duplicados al propagar el folio operativo.
  - Corregida la lectura prematura de `sale.IdVenta`: con `SaveChangesAsync(false)` el valor generado puede permanecer diferido; ahora se consulta en SQL Server dentro de la transacción antes de propagarlo.
  - MARS deshabilitado en la conexión operativa para conservar los savepoints de EF Core.
  - Prueba automatizada confirma que consultar una venta por GUID y por `IdVenta` devuelve la misma operación.

## Validación humana pendiente de la corrección actual

- Reiniciar la instancia Debug del API que escucha en el puerto 5000 para cargar los binarios corregidos y la conexión sin MARS.
- Registrar una venta real controlada y confirmar que devuelve HTTP 201, descuenta stock una sola vez y asigna el mismo `IdVenta` a venta, partidas y movimientos.

## Pendientes reales de Fase 1

- Incorporar una **migración inicial/baseline reproducible** para construir `PosLambrinDb` desde una base SQL Server completamente vacía.
- Diseñar e implementar **Promociones** con reglas de acumulación/prioridad.
- Diseñar **Entregas/Envíos** y su flujo de estados.
- Exportación formal de Reportes a **PDF/XLSX**.
