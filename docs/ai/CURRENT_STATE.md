# CURRENT STATE — Estado Real del Sistema WPC Bajío

## Liberación Oficial — Versión 2.0.0 (Fase 1 Comprobada y Validada)

- **Versión**: `2.0.0`
- **Línea Base Git**: `fase-1.1`, commit `e89ea8d` + versión 2.0.0.
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
- **Directorio de Clientes**:
  - Campo de teléfono validado estrictamente a sólo números.
  - Formulario de dirección reordenado solicitando primero el CP y autocompletando Ciudad y Estado mediante `servicioCodigoPostal.ts` (catálogo estandarizado de municipios de Guanajuato y México).
- **Validación**: backend Domain tests **19/19**; Application tests **35/35**; frontend build Vite exitoso (90 módulos); Vitest **10/10**.

## Estado de la aplicación

- **Línea base Git**: rama `fase-1.1`, commit `e89ea8d`; cambios de adopción operativa de `IdVenta` preparados localmente.
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
- Exportación formal de Reportes a **PDF/XLSX**.
