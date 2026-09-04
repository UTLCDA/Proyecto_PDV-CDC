# CURRENT STATE — Estado Real del Sistema WPC Bajío

## 🟢 ESTADO ACTUAL (4 de Septiembre, 2026)

- **Infraestructura Cloud VPS (Ubuntu 26.04 LTS - 193.46.198.88)**: **APROVISIONADO AL 100%**
  - **Motor de Base de Datos**: Microsoft SQL Server 2022 Express en contenedor Docker oficial (`mcr.microsoft.com/mssql/server:2022-latest`), con almacenamiento persistente en `/var/opt/mssql`, política de reinicio `unless-stopped` y swap de 2GB para garantizar estabilidad de memoria.
  - **Base de Datos Unificada**: `PosLambrinDb` creada con 26 tablas físicas autoritativas, migraciones y semillas iniciales (Roles Admin/Cajero, 27 permisos, usuario administrador y cliente público general) aplicadas mediante `clean_init.sql`.
  - **Credencial de BD**: Usuario `wpcadminaam` con permisos `db_owner` y autenticación SQL Server activa en `localhost:1433`.
  - **Runtime .NET**: .NET 9 ASP.NET Core Runtime (v9.0.19) instalado en `/usr/share/dotnet` y symlink en `/usr/bin/dotnet`.
  - **Reverse Proxy Nginx**: Configurado en puerto 80 con reenvío de headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) hacia `http://127.0.0.1:5000` con `client_max_body_size 50M`.
  - **Servicio Systemd**: `pos-api.service` configurado y habilitado en inicio del sistema para ejecutar la API en `/var/www/pos-api`.
  - **Seguridad y Firewall (UFW)**: Puertos 22 (SSH), 80 (HTTP) y 443 (HTTPS) habilitados; puerto 1433 de SQL Server aislado internamente en localhost para máxima seguridad.
  - **Binarios de API Release**: Generados en `dist_vps_api` y empaquetados en `dist_vps_api.tar.gz` (7.2 MB) listos para transferir al VPS.

- **Instalación y Despliegue Local en IIS y SQL Server**: **COMPLETADO AL 100%**
  - **Base de Datos Física**: SQL Server `PosLambrinDb` montada limpia y verificada con Autenticación por Usuario.
    - **Servidor**: `.` (o `localhost`)
    - **Autenticación**: SQL Server Authentication
    - **Login**: `wpcadminaam` | **Password**: `Aaron2804#`
    - **Tablas Creadas**: 26 tablas físicas verificadas y semillas autoritativas de roles/permisos/admin cargadas.
    - **HotFix 2.2.1 (Rol Cajero y Codificación Unicode)**: Se registró el Rol Cajero (`E7B81234-5678-4900-A111-000000000005`) con sus 17 permisos operativos y se corrigieron todos los acentos y caracteres especiales (`NVARCHAR` Unicode) en SQL Server (`Acceso total al sistema WPC Bajío`, `Operación del Punto de Venta y Cobro en Caja`).
    - **HotFix 2.2.2 (Edición e Inactivación de Roles)**: Habilitada la edición de descripción, matriz de permisos y cambio de estado (`Activo` / `Inactivo`) para el Rol Cajero y roles personalizados desde el modal de edición de roles.
    - **HotFix 2.2.3 (Ocultamiento y Restricción de Transacciones a Cajero)**: Se restringió la pestaña `💳 Transacciones` ("Histórico de Transacciones y Movimientos de Pago") y el endpoint `/api/v1/payments/transactions` para requerir el permiso ejecutivo `reportes:ver_ventas`. El rol Cajero ya no ve la pestaña ni puede acceder a la API de histórico de pagos.
    - **HotFix 2.4.1 (Resolución Dinámica de API en Túneles Cloudflare y Timeout de Autenticación)**: Se actualizó `apiClient.ts` para resolver dinámicamente `/api/v1` en conexiones HTTPS y túneles Cloudflare (`pos.wpcbajio.com`, `trycloudflare.com`), eliminando el bloqueo de *Mixed Content* y permitiendo el acceso y login fluido desde dispositivos móviles externos. Se añadió timeout de 15 segundos con `AbortController` y `allowedHosts: true` en `vite.config.ts`. Validado al 100% con TryCloudflare.
    - **Feature 2.4.0 (Conversión SKU a Guiones, Campo Color y Ficha Técnica PDF)**: Conversión automática de espacios a `-` en SKU, campo Color en formulario y BD SQL Server (`Color NVARCHAR(100)`), y botón de descarga **📄 Ficha Técnica** PDF en tabla de catálogo con desglose de precios menudeo, mayoreo, caja completa y regla comercial.
    - **Feature 2.3.0 (SKU Libre Captura y Código de Barras Dinámico en Base64)**: SKU sin prefijo forzado `WPC-`. Creado el generador dinámico de código de barras Code 128 (`barcodeGenerator.ts`), con previsualización visual de imagen en tiempo real dentro del modal de producto, almacenamiento en Base64 y botón de descarga de etiqueta PNG.
  - **Publicación en IIS**:
    - **Backend API (.NET 9)**: Publicado en Release en `C:\inetpub\wwwroot\pos-api` (`http://localhost:5000`).
    - **Frontend SPA (React)**: Publicado en Producción en `C:\inetpub\wwwroot\pos-web` (`http://localhost`).
  - **Pruebas y Verificación**: 92 / 92 pruebas ejecutadas y pasando al 100% (68 backend xUnit, 24 frontend Vitest).

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
