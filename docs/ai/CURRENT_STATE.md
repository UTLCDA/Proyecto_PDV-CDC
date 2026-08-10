# CURRENT STATE — Estado Real del Sistema WPC Bajío

## Estado de la aplicación

- **Línea base Git**: tag local `v1.2.0`. La iteración posterior continúa sin commit/tag nuevo y requiere validación humana antes de publicarse.
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

- **Ventas**: validación de caja aperturada requerida antes de completar ventas; anticipo exige cliente real; folios transaccionales únicos.
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

## Validación ejecutada (2026-08-10 - Iteración 4)

- **Backend xUnit**: **56/56** aprobadas al 100%.
- **Backend build**: solución `src/backend/Pos.slnx`, **0 advertencias / 0 errores**.
- **Frontend Vitest**: **8/8** aprobadas al 100%.
- **Frontend producción**: `tsc && vite build`, exitoso sin errores (88 módulos transformados).
- **📦 Catálogo de Productos**: Ocultamiento dinámico de dimensiones (Largo, Alto, Ancho), cobertura por pieza y precios de mayoreo cuando la Unidad de Medida es distinta de `Caja`, cambiando la etiqueta a `Piezas / Contenido *` y manteniendo `Cantidad Inventario Inicial *`.
- **🧾 Histórico de Ventas**: Filtrado estricto por rango de fechas en UTC y recálculo dinámico de tarjetas métricas del encabezado exclusivamente sobre ventas filtradas.
- **💰 Abonos a Saldos Pendientes**: Inclusión explícita de registros mapeados para el `Anticipo Inicial` de ventas en modalidad de apartado en el historial global de abonos.
- **💳 Histórico de Transacciones**: Corrección en `CommercialOpsPage.tsx` vinculando el estado `transactionHistory` en la vista de transacciones (en lugar del arreglo de abonos `installmentHistory`), mapeo de respaldo para ventas con `MontoTotal > 0` en `MapInitialTransactions` ([CommercialOperationsService.cs](file:///d:/Proyecto_PDV-CDC/src/backend/Pos.Infrastructure/Services/CommercialOperationsService.cs)) y botón `Limpiar Filtros`.
- **🛒 Punto de Venta (PDV)**: Agregada la opción `💳 Pago total con tarjeta` en el selector de Modalidad de Pago.
- **💵 Turno de Caja**: Mapeo explícito de la categoría `Corte X` para transacciones `XReport` (corrigiendo la clasificación errónea como Corte Z), formateo estandarizado de la columna Descripción en Movimientos Generales a `abono a venta` tanto para `Venta / Abono` como para `Venta (Cotización)`, y `Entrada de dinero a caja` para `Ingreso / Cambio`.
- **📑 Cotizaciones y Presupuestos**: Incorporación de los campos explícitos `Anticipo Inicial` (`-$500.00` en verde) y `Monto Restante` (`$X,XXX.XX` en rojo) junto con el distintivo `<span class="badge badge-success">Convertida (Apartado)</span>` al consultar cotizaciones convertidas con modalidad de apartado (`AdvanceDeposit`) en `QuoteListPage.tsx`, respaldado por el recálculo en `MapQuoteToDto` ([CommercialOperationsService.cs](file:///d:/Proyecto_PDV-CDC/src/backend/Pos.Infrastructure/Services/CommercialOperationsService.cs)).

## Pendientes reales de Fase 1

- Incorporar una **migración inicial/baseline reproducible** para construir `PosLambrinDb` desde una base SQL Server completamente vacía.
- Diseñar e implementar **Promociones** con reglas de acumulación/prioridad.
- Diseñar **Entregas/Envíos** y su flujo de estados.
- Exportación formal de Reportes a **PDF/XLSX**.

