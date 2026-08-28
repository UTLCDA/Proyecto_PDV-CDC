# CHANGELOG — WPC Bajío POS & Platform

All notable changes to this project will be documented in this file.

## [2.4.0 Feature] - 2026-08-28

### Añadido / Corregido
- **Conversión Automática de Espacios a Guiones (`-`) en SKU**: Al escribir espacios en el campo SKU del formulario modal de productos, el sistema reemplaza dinámicamente cada espacio por un guion `-` (`replace(/\s+/g, '-')`), garantizando la estandarización y formato limpio del código SKU tanto en frontend como backend.
- **Campo de Color y Persistencia en Base de Datos**: Se incorporó el campo **Color / Tono** en las entidades de dominio (`Product.cs`, `Producto.cs`), DTOs, columna SQL Server `Color NVARCHAR(100)` y en el formulario modal de productos.
- **Generación y Descarga de Ficha Técnica PDF (`technicalSheetGenerator.tsx`)**: Se añadió el botón **`📄 Ficha Técnica`** en la tabla del catálogo de productos. Genera un documento PDF oficial con membrete WPC Bajío que incluye:
  - SKU, Color, Código de Barras (con imagen renderizada).
  - Especificaciones técnicas de material y dimensiones (Largo x Ancho x Alto x Cobertura m² por pieza/caja).
  - **Desglose de Precios**: Precio Menudeo (individual), Precio Mayoreo (por pieza) y Precio por Caja Completa (`Piezas por caja × Precio Mayoreo`).
  - **Regla Comercial de Aplicación de Precios**: Explicación formal donde si se llevan las piezas contenidas en una caja completa (o superior), aplica Precio Mayoreo; si llevan menos piezas que la caja, aplica Precio Menudeo.

## [2.3.0 Feature] - 2026-08-28

### Añadido / Corregido
- **SKU de Libre Captura**: Se eliminó el prefijo forzado u obligatorio `WPC-` en el campo SKU del modal de alta/edición de productos (`PaginaCatalogoProductos.tsx`), permitiendo ingresar cualquier código o SKU personalizado libremente.
- **Generación Dinámica de Código de Barras en Base64**: Implementado el módulo `barcodeGenerator.ts` con estándar Code 128. Al escribir o escanear un código de barras en el modal de producto, el sistema genera dinámicamente su representación visual en Base64 (`data:image/png;base64,...`).
- **Espacio de Previsualización y Descarga PNG de Etiqueta**: Se añadió un cuadro de previsualización visual en el formulario de producto que muestra la imagen del código de barras renderizada en tiempo real, indica la longitud de la cadena Base64 e incluye un botón para descargar la etiqueta PNG de forma local para impresión.

## [2.2.5 HotFix] - 2026-08-28

### Corregido
- **Reversión de Restricciones en Módulo de Abonos**: Se restauró la funcionalidad completa del módulo `💰 Abonos` para el **Rol Cajero** (y cualquier rol con `comercial:abonos`), permitiéndole registrar abonos, consultar el historial de abonos y comprobantes normalmente.
- **Alerta por Modal de Acceso Restringido (`AccessDeniedModal`)**: Se implementó un nuevo componente visual `AccessDeniedModal` y manejo centralizado de respuestas `403 Forbidden` e intentos de navegación no autorizada. Si un usuario sin permisos intenta acceder a un módulo restringido o realizar una transacción no autorizada, el sistema despliega un modal interactivo indicando que no cuenta con los permisos necesarios.

## [2.2.4 HotFix] - 2026-08-28

### Corregido
- **Ocultamiento del Histórico de Transacciones en el Módulo de Abonos para Cajero**: Se restringió la visualización del bloque de **Histórico de Transacciones / Abonos** (`commercial-global-history`) en la pantalla de Abonos.
- **Operación Restringida y Segura para Cajeros**: El Cajero con permiso `comercial:abonos` sólo puede buscar ventas pendientes, registrar abonos y consultar/imprimir el comprobante de la venta actual. Toda la tabla de reporte histórico global y endpoints `/payments/installments` quedan ocultos y restringidos exclusivamente para Administradores.

## [2.2.3 HotFix] - 2026-08-28

### Corregido
- **Restricción de Acceso a Transacciones para Cajero**: Se vinculó el módulo **Histórico de Transacciones y Movimientos de Pago** (`/payments/transactions`) y la pestaña `💳 Transacciones` a los permisos ejecutivos de reporte (`reportes:ver_ventas` / `usuarios:administrar`).
- **Seguridad en Backend y Frontend**: El **Rol Cajero** ya no ve la pestaña de Transacciones en el menú superior ni tiene acceso al endpoint `/api/v1/payments/transactions` (retorna `403 Forbidden`).

## [2.2.2 HotFix] - 2026-08-28

### Corregido
- **Edición e Inactivación de Roles**: Se habilitó la edición completa de descripción, matriz de 27 permisos e inactivación (`EstaActivo = false`) para el **Rol Cajero** y roles personalizados.
- **Protección de Seguridad Admin**: Se mantiene la protección del nombre de roles del sistema (`Administrador` y `Cajero`) y el rol `Administrador` permanece activo y con permisos totales para evitar bloqueos accidentales del sistema.

## [2.2.1 HotFix] - 2026-08-28

### Corregido
- **Rol de Seguridad Cajero**: Se incluyó e insertó el **Rol de Seguridad Cajero** (`E7B81234-5678-4900-A111-000000000005`) y sus 17 permisos operativos en la base de datos SQL Server `PosLambrinDb` y en los scripts de inicialización (`scratch/clean_init.sql`).
- **Desplegable de Alta de Usuarios**: El listado de roles en la pantalla de gestión de usuarios ([`PaginaUsuarios.tsx`](file:///c:/Users/wpcba/OneDrive/Documents/PDV/src/frontend/pos-web/src/pages/Users/PaginaUsuarios.tsx)) ahora muestra las opciones **Administrador** y **Cajero**.

## [2.2.0] - 2026-08-28

### Entrega Final PR - Rama `version-final-de-PR`
- **Punto de Venta (PDV)**:
  - Botones de selección rápida renombrados a `Pieza +` (1 pieza) y `Caja +` (1 caja = `piecesPerBox` piezas).
  - Buscador de tarjetas de catálogo en tiempo real arriba de `📦 Catálogo rápido`.
  - Habilitado el rol Cajero para registrar clientes nuevos desde caja (`clientes:crear`), con restricción estricta de no edición (`clientes:editar`).
  - Desglose visual explícito de piezas, cajas y m² en los elementos del carrito de compras (`23 Pzas (2 Cjas + 3 Pzas) · $290.00 · 10.01 m²`).
  - Corrección del cálculo de cobertura en carrito y totales para multiplicar por la cobertura individual por pieza (`coveragePerUnitSqM`).
  - Integración de **📐 Calculadora de m² de Lambrín** en la tarjeta de cobro (`pos-checkout`) con estimación de piezas necesarias, cajas equivalentes y botón de adición directa al carrito en 1 clic.
  - Imágenes de catálogo rápido en PDV ampliadas a 92px.
- **Catálogo de Productos y Costo Neto**:
  - Incorporación del campo `Costo Neto / Inicial ($ MXN)` (`unitCost`) en el modal de alta y edición de productos.
  - Persistencia full-stack de `CostoUnitario` que alimenta automáticamente la columna de Costo Neto (COGS) y el cálculo de Ganancia en los Movimientos de Inventario.
  - Cabeceras bilingües en la tabla del catálogo (`Precio Menudeo / 零售价` y `Precio Mayoreo / 批发价`) e insignias de cobertura por pieza y caja.
- **Control de Clientes y Límite Diario de Cajas**:
  - Permiso `clientes:limite_diario` y campo `LimiteCajasDiarias` en la entidad `Cliente`.
  - Validación autoritativa en `SaleApplicationService` que verifica ventas previas del día y bloquea transacciones que superen el límite de cajas del cliente.
  - Modal de **Historial de Compras de Cliente** disponible en el directorio de clientes.
- **Movimientos de Inventario y Reportería Bilingüe**:
  - Remoción de cadenas GUID crudas en la interfaz visual: Columna Motivo en Movimientos de Inventario despliega el folio operativo identity `Venta #X`, y los turnos de caja muestran `CAJA-YYYYMMDD-1` (folio incremental secuencial por día) en la tarjeta principal `cash-card`, listado de cortes y bitácora de auditoría.
  - Cancelación de Ventas exclusiva para Administradores (`ventas:cancelar`), con reintegración automática de existencias a `Stocks`, bitácora de auditoría y desfalco/recalculo en tiempo real del balance de Corte de Caja.
  - Ajuste en la visualización de impuesto: ventas no facturadas muestran `$0.00` de impuesto.
  - Exportaciones PDF y Excel con 100% de encabezados bilingües en **Español y Chino Simplificado** con registro singleton de fuentes CJK para renderizado ultrarrápido y sin mojibake.
- **Pruebas y Verificación**:
  - Pruebas Backend xUnit: **67/67** pasadas.
  - Pruebas Frontend Vitest: **24/24** pasadas.
  - Compilación Vite de producción: Exitosa con 0 errores.

## [2.0.0] - 2026-08-12

### IVA Transparente en PDV y Cotizaciones
- El IVA (16%) se calcula fijamente sobre el Subtotal base del producto sin verse afectado por el descuento de la venta (`MontoIva = SubTotal * 0.16`). El descuento reduce directamente el total a pagar sin alterar la base gravable del impuesto (ejemplo Venta #48: subtotal $899.00, IVA $143.84, descuento $100.00 -> total $942.84).

### Zona Horaria Local y Parseo UTC (Guadalajara -06:00 CT)
- Formateador universal `parseUtcDate` / `UtcDateTimeJsonConverter` para serializar fechas en ISO 8601 UTC (`yyyy-MM-ddTHH:mm:ss.fffZ`) y convertirlas automáticamente a la hora local real del usuario (ej. 02:35 AM), sin modificar registros existentes en la BD.

### Desglose de Abonos e Histórico Global (Tabla de Amortización)
- Se corrigió la mutación errónea de `MontoAnticipo` en la entidad `Venta` durante la posterior recepción de abonos.
- Se incluyó `.Include(s => s.Abonos)` en `GetInstallmentHistoryAsync`, `GetInstallmentsBySaleReferenceAsync` y `GetPaymentTransactionsAsync` para calcular dinámicamente el Anticipo Inicial ($6.00) y Saldo Pendiente resultante ($400.00).
- La tabla `commercial-global-history` refleja la amortización histórica exacta por movimiento.

### Comprobantes Históricos por Corte (`<HistoricoAbonosCorrectoComprobante>`)
- `SaleReceiptModal` incluye soporte para `targetPaymentId` y `cutoffDate` con rebanado por índice (`slice(0, targetIdx + 1)`).
- Al abrir el comprobante desde cualquier fila de abono o transacción, el recibo muestra la foto acumulada exacta de pagos y saldo pendiente hasta el momento de dicho abono.
- Corregida la tabla dedicada de Histórico de Transacciones, que omitía `targetPaymentId` y `cutoffDate` al abrir el comprobante. Las acciones de abonos y transacciones comparten ahora `paymentReceiptArguments`, evitando que un movimiento anterior muestre pagos posteriores.
- Caso validado: Venta #49 a las 02:14 muestra únicamente $42.83 y saldo $1,000.01; el movimiento posterior de las 02:42 conserva el acumulado de $52.83 y saldo $990.01.

### Formulario de Clientes y Servicio de Código Postal
- El input de teléfono valida exclusivamente la captura de números (dígitos `0-9`).
- Se reordenó el formulario pidiendo primero el CP y se creó `servicioCodigoPostal.ts` para autocompletar dinámicamente la Ciudad y Estado.

## [Unreleased] - 2026-08-17

### Exportación administrativa PDF y Excel

- Se reordena el card de Histórico de Ventas separando título/exportación y filtros para evitar compresión y desalineación.
- Se elimina el contador aislado del encabezado de Histórico de Transacciones y se adapta el toolbar del Directorio de Clientes mediante grid responsive.
- Los errores de alta/edición de usuario se muestran dentro del modal; se incorpora una guía dinámica de contraseña para longitud, mayúscula, minúscula, número y símbolo, sincronizada con la validación backend.
- Movimientos de Inventario presenta el rango en un bloque “Periodo del movimiento”, con etiquetas visibles para fecha inicial/final y comportamiento responsive.
- Se agrega un estándar reutilizable para exportar reportes PDF profesionales y libros Excel tipados desde ventas, clientes, productos, inventario, cotizaciones, operaciones comerciales, caja, reportes, usuarios, roles y auditoría.
- Los PDF incluyen logo oficial, identidad WPC Bajío, filtros aplicados, orientación configurable, tabla multipágina con encabezados repetidos y numeración de páginas.
- Los XLSX incluyen fechas/números reales, formatos monetarios y porcentuales, autofiltro, encabezado congelado, ajuste de columnas, bordes y filas alternadas.
- Los listados paginados recuperan el conjunto completo autorizado en lotes de 500 usando parámetros API opcionales y retrocompatibles; nunca se exporta silenciosamente sólo la página visible.
- Los periodos inician con el día operativo de `America/Mexico_City` y los archivos conservan los últimos filtros realmente consultados.
- Se excluyen acciones, GUID técnicos y datos sensibles; los módulos de ventas utilizan `IdVenta` y `RECIBO-{IdVenta}`.
- Sin cambios de esquema SQL, PK/FK, permisos, reglas comerciales ni generación de ventas.
- Cobertura ampliada a backend **67/67** y frontend **21/21**, con builds Release/Vite aprobados.

### Referencias operativas de recibo `RECIBO-{IdVenta}`

- Se centraliza la generación y lectura de referencias mediante `ReceiptReferences`; pagos completos, anticipos y abonos muestran exclusivamente `RECIBO-{IdVenta}`.
- Las búsquedas de abonos y transacciones aceptan tanto `47` como `RECIBO-47` y devuelven la misma venta.
- El comprobante de venta muestra explícitamente la referencia operativa; React deja de depender de referencias GUID o variantes `PAGO-`/`ANTICIPO-`.
- Migración transaccional `20260810131157_StandardizeReceiptReferencesByIdVenta`: normaliza 11 recibos y 8 movimientos de caja; 0 huérfanos y 0 referencias antiguas residuales en tablas operativas.
- `IX_PaymentInstallments_NumeroRecibo` pasa de único a no único porque varias filas de abono de una misma venta comparten legítimamente `RECIBO-{IdVenta}`; el GUID del movimiento continúa siendo su identidad técnica.
- Validación: backend **65/65**, frontend **10/10**, builds Release/Vite aprobados y QA local sin errores de consola.

### `IdVenta` como folio operativo integral

- `GET /api/v1/sales/{idVenta:int}` es la consulta operativa principal; se mantienen rutas GUID compatibles y se agrega el alias técnico `/by-guid/{guid}`.
- Abonos y devoluciones resuelven `IdVenta` hacia el GUID interno y validan consistencia cuando un cliente antiguo envía ambos identificadores.
- Historial, comprobantes, mensajes, cotizaciones convertidas, abonos, transacciones, devoluciones, contratos, caja, inventario y auditoría muestran `Venta #IdVenta`.
- Las búsquedas numéricas son exactas por `IdVenta`; se evita que el texto de `NumeroFolio` produzca falsos positivos.
- Auditoría permite filtrar por `IdVenta` y normaliza visualmente referencias históricas sin alterar los registros inmutables.
- Migración no destructiva `20260810123707_BackfillOperationalSaleReferences`: completa 39 movimientos de venta, 1 devolución y 6 transacciones de abono; no modifica PK, FK, `IDENTITY` ni índices existentes.
- Cobertura ampliada a backend **58/58** y frontend **9/9**, con builds Release/Vite aprobados.

### Corrección de persistencia de ventas con `IdVenta`

- Corregido el segundo `SaveChangesAsync(false)` que intentaba insertar nuevamente la venta, sus partidas y movimientos con los mismos GUID, provocando violaciones de `PK_Sales`, `PK_SaleItems` y `PK_InventoryMovements`.
- La venta se inserta una sola vez dentro de la estrategia reintentable de SQL Server. El `IdVenta` generado se consulta por el GUID dentro de la misma transacción, evitando depender de la promoción diferida de valores de `SaveChangesAsync(false)`, y se propaga a `SaleItems` e `InventoryMovements` mediante actualizaciones directas.
- Se valida el número de filas secundarias actualizadas para revertir toda la operación ante una propagación incompleta.
- Eliminado `MultipleActiveResultSets=true` de la conexión operativa para que EF Core pueda utilizar savepoints durante las transacciones.
- Agregada prueba de equivalencia entre la consulta por GUID y por folio operativo `IdVenta`; backend **57/57**.

## [1.3.1] - 2026-08-10

### Folio Operativo Consecutivo `IdVenta` (Rama `fase-1.1`)

- **Incorporación de Folio Consecutivo `IdVenta`**:
  - **Base de Datos**: Columna `IdVenta INT IDENTITY(1,1) NOT NULL` con índice `UNIQUE` en la tabla principal `Sales`. Columna `IdVenta INT NULL` e índices de trazabilidad en `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements` y `CashTransactions`.
  - **Compatibilidad Total**: Preservados al 100% los identificadores `Id` GUID, PKs y FKs sin reemplazo ni modificación de relaciones existentes.
  - **Poblado Automático de Históricos**: Propagación retroactiva de `IdVenta` sobre ventas y módulos secundarios existentes.
  - **API REST**: Nuevo endpoint opcional `GET /api/v1/sales/folio/{idVenta:int}` manteniendo intacto `GET /api/v1/sales/{id:guid}`.
  - **Interface & Comprobantes**: Visualización del folio operativo (`Folio #00000157`) en la tabla de Histórico de Ventas y el modal de comprobantes.

## [1.3.0] - 2026-08-10

### Finalización de Fase 1 — Sistema PDV e Inventario WPC Bajío

- **Ajustes Funcionales Multi-Módulo (Iteración 5 - Finalización Fase 1)**:
  - **Catálogo de Productos WPC Bajío**: Ocultamiento dinámico de dimensiones (Largo, Alto, Ancho), cobertura por pieza y precios de mayoreo cuando la Unidad de Medida es distinta de `Caja`. Cambio automático de etiqueta a `Piezas / Contenido *`.
  - **Histórico de Ventas**: Recálculo dinámico de tarjetas métricas del encabezado exclusivamente sobre ventas devueltas en el período filtrado.
  - **Abonos a Saldos Pendientes**: Inclusión explícita del `Anticipo Inicial` de ventas de apartado en el historial global de abonos.
  - **Histórico de Transacciones**: Renderizado del desglose completo de todos los movimientos de pago (Anticipos Iniciales, Pagos Totales de Venta y Abonos a Saldo) con el botón `Limpiar Filtros`.
  - **Punto de Venta (PDV)**: Agregada la opción `💳 Pago total con tarjeta` en el selector de Modalidad de Pago.
  - **Turno de Caja y Arqueos**: Tarjeta métrica `📥 Ingreso / Ajuste Cambio` (`totalEntradas`). Mapeo explícito de la categoría `Corte X` para transacciones `XReport` (corrigiendo la clasificación errónea como Corte Z) y normalización de descripciones en Movimientos Generales (`abono a venta` y `Entrada de dinero a caja`).
  - **Cotizaciones y Presupuestos**: Campos explícitos `Anticipo Inicial` (`-$500.00` en verde) y `Monto Restante` (`$X,XXX.XX` en rojo) junto con la insignia `<span class="badge badge-success">Convertida (Apartado)</span>` al consultar cotizaciones convertidas en modalidad `Venta con Anticipo / Apartado`.

## [1.2.2] - 2026-08-09

- **Ajustes y Correcciones Multi-Módulo (Iteración 3 - 2026-08-09)**:
  - **Normalización Universal de Fechas UTC**: Normalización a `23:59:59.999` para la fecha final en `ReportingApplicationService`, `SaleApplicationService`, `InventoryApplicationService` y `CommercialOperationsService`.
  - **Punto de Venta**: Ticket impreso/en pantalla muestra encabezado inteligente (**Forma de Pago** para pagos completos y **Historial de Pagos / Abonos** sólo para apartados/abonos); `pos-daily-summary` alineado a la fecha local `YYYY-MM-DD`.
  - **Turno de Caja**: Cálculo dinámico de `Esperado en Caja ($)` ($750) en turnos abiertos en la tabla de histórico; traducciones e insignias en español en `Movimientos Generales del Día` (*Venta*, *Venta (Cotización)*, *Abono*, *Devolución*, *Ingreso / Cambio*, *Retiro / Sangría*).
  - **Cotizaciones**: Modal `👁️ Ver Cotización` ajustada con contenedor scrollable horizontal interno `minWidth: 450px` sin desbordar la pantalla.
  - **Abonos y Transacciones**: Estilos `.commercial-history-filters label` e `<input type="date">` ajustados a tamaño compacto elegante en `CommercialOpsPage.css`.
  - **Reportes e Inventario**: Formato ISO directo en consultas de fecha para evitar desfasamiento por zona horaria local.

## [1.2.1] - 2026-08-08

- **Correcciones Integrales Multi-Módulo (2026-08-08)**:
  - **Caja & Corte Z**: Inclusión de Corte Z de emergencia para administradores y recuperación automática del turno activo.
  - **Cotizaciones**: Validación estricta de turno de caja aperturado antes de ejecutar `⚡ Convertir y cobrar`.
  - **Abonos y Transacciones**: Acción `👁️ Consultar Comprobante de Venta`, tabla estilizada con íconos de forma de pago (💵, 💳, 🏦), valores por defecto a la fecha actual y filtros por medio de cobro.
  - **Contratos A4**: Generador con texto predeterminado, variables dinámicas (`{{FOLIO}}`, `{{CLIENTE}}`, `{{TOTAL}}`, `{{SALDO}}`, `{{FECHA}}`, `{{VENDEDOR}}`) y diseño membretado con logo WPC Bajío.
  - **Movimientos de Inventario**: Expansión de sinónimos C# backend a plurales (`ventas`, `salidas`, `entradas`, `ajustes`, `devoluciones`) y límites UTC en rangos de fechas.
  - **Reportes & Clientes**: Corrección de llaves i18n `lowStockProductDetail`, `noLowStockProducts`, `customerStatus` y `inactiveStatus`.
  - **Histórico de Ventas**: Etiquetas de fecha inicio/fin, solución a valores `$NaN` en tarjetas de resumen y mapeo del filtro de apartado (`PendientePago` -> `ApartadoPagado`).

## [1.2.0] - 2026-08-07

### Visual identity

- Nueva paleta oficial WPC Bajío centralizada en variables CSS: fondo marfil, superficies blancas, contenedores crema, primario terracota, textos café y bordes arena.
- Logo aprobado incorporado al inicio de sesión y encabezado.
- Tema aplicado a navegación, PDV, Caja, Reportes, Cotizaciones, Abonos/Contratos, Catálogo, Inventario, Clientes, Usuarios, tablas, formularios y modales.
- Catálogo rápido y Carrito de Venta usan fondo crema con cards internas blancas; botones, buscadores, totales, elementos activos y focus usan el primario aprobado.
- Se eliminaron colores oscuros/azules, gradientes y colores HEX/RGB hardcodeados fuera del archivo global del tema.
- Navegación responsive validada a 1920×1080, 1440×900, 1366×768 y 768×1024 sin desbordamiento horizontal.
- Migración exclusivamente visual: sin cambios de lógica, API, servicios, modelos, rutas, validaciones, permisos, cálculos o base de datos.

### Completed modules

- Clientes con validación, unicidad de correo/RFC, estados y auditoría.
- Cotizaciones con precios autorizados, vigencia, folios únicos y conversión atómica con pago explícito.
- Abonos, devoluciones y contratos con persistencia real, permisos, auditoría y operaciones transaccionales.
- Reportes reales de venta bruta/neta, devoluciones, cobros, ranking de productos, inventario y bitácora filtrable.
- Catálogo reforzado con SKU `WPC-`, barcode único, categorías/slug, precios, unidades, dimensiones e imágenes validadas.

### Database

- Migración `20260805092442_CompleteCommercialOperations` para restricciones y permisos comerciales.
- Migración `20260805095319_CompleteReportsAndCatalog` con índices únicos de catálogo/stock e índices de auditoría.
- Migración `20260805095914_NormalizeDefaultWarehouseLocation` para unificar la ubicación temporal aprobada.
- Arranque corregido: bases relacionales usan `MigrateAsync`; `EnsureCreatedAsync` queda reservado a proveedores no relacionales.

### Fixed

- Ventas, conversión de cotizaciones, abonos y devoluciones ya ejecutan sus transacciones explícitas dentro de la estrategia de reintentos de SQL Server, eliminando la excepción de `SqlServerRetryingExecutionStrategy`.
- Inventario y Reportes ya no muestran registros o cifras ficticias cuando falla la API.
- Reportes descuenta devoluciones y protege la bitácora con permiso de administración de usuarios.
- Creación de productos usa `Bodega Adolfo Lopez Mateos` en lugar de `Almacén Principal`.
- Formularios de Reportes ya no recargan mientras el usuario captura filtros.

### Security
- El menú de navegación ahora respeta los permisos de la sesión y limita el rol Cajero al módulo Punto de Venta.
- Se añadieron políticas de autorización por permiso a los controladores y acciones de la API; accesos no autorizados responden `403 Forbidden`.
- Serilog UI deja de mostrarse a usuarios sin permiso `usuarios:administrar`.
- El alta/edición de usuarios exige un rol activo por ID y ya no asigna un rol de respaldo ante entradas inválidas.
- Se protege al último administrador activo, la propia sesión y los roles del sistema; cambios sensibles revocan refresh tokens.
- Access tokens limitados a 30 minutos con renovación coordinada en el frontend.

### Added
- Administración completa de roles personalizados y matriz de 24 permisos agrupados por módulo.
- Endpoints protegidos para consultar roles/permisos y crear/actualizar roles con auditoría.
- Pestañas de Usuarios y Roles, búsqueda, estados, conteos y formularios responsive ES/ZH.
- Corte X sin cierre, confirmación de Corte Z, historial de turnos y movimientos de caja.
- Política compuesta de lectura de Caja para roles con cualquier operación autorizada del módulo.
- PDV completo con catálogo rápido, stock disponible, mayoreo automático, IVA, cobertura, pagos mixtos/anticipos, historial y comprobante imprimible.
- Migración `20260805085801_AddUniqueOperationalFolios` con índices únicos para folios de ventas y turnos.

### Changed
- El rol Cajero conserva sólo `ventas:procesar`, `catalogo:productos_ver` y `clientes:ver`, requeridos para operar el PDV.
- Migración `20260805071520_RestrictCashierToPointOfSale` aplicada a `PosLambrinDb` para actualizar usuarios existentes.
- El cierre de caja calcula ventas exclusivamente dentro del intervalo real del turno y excluye ventas canceladas/inactivas.
- Retiros limitados al efectivo esperado y Corte Z con justificación obligatoria ante sobrante/faltante.
- Navegación responsive sin desbordamiento horizontal en móvil.
- Procesamiento de ventas transaccional y autoritativo en servidor; el precio enviado por el cliente ya no determina el cobro.
- Anticipos, pagos mixtos y descuentos ahora se validan contra total, cliente y permiso antes de modificar inventario.

### Tests
- Cobertura backend ampliada a 56 pruebas y frontend a 8 pruebas, incluyendo permisos, precios manipulados, mayoreo, descuentos, anticipos, stock, cotizaciones, abonos, devoluciones, reportes netos y validaciones de catálogo.
- Prueba de integración de venta aprobada contra `AAM/PosLambrinDb`, verificando persistencia consistente de venta, partida, movimiento de inventario y auditoría bajo `EnableRetryOnFailure`.

## [1.2.0] - 2026-08-04

### Added
- Evidencia física opcional por movimiento de inventario, con vista previa, límite de 2 MB, persistencia SQL Server, miniatura en historial y visor modal integrado sin abrir pestañas nuevas.
- Migración EF Core incremental `20260804135557_AddInventoryMovementEvidenceImage`, aplicada a `PosLambrinDb`.
- Columnas `Cantidad Anterior` y `Cantidad Nueva` en el historial de movimientos.
- Miniatura de producto en la tabla de existencias.
- Captura y persistencia de ubicación de almacén con valor temporal `Bodega Adolfo Lopez Mateos`.
- Filtrado inmediato por lector USB de código de barras.

### Changed
- Modal de movimientos responsivo, con campos limpios, cantidad borrable y motivo multilinea.
- Tipos de movimiento traducidos; Entrada usa verde, Salida rojo, Ajuste cian y Venta amarillo.
- La consulta de evidencia física ahora abre un modal responsivo con cierre por botón, fondo o tecla `Esc`, en lugar de navegar a una pestaña vacía.
- Auditoría de inventario incluye cambio de ubicación y presencia de evidencia sin copiar imágenes Base64 al log.
- El arranque deja de recrear destructivamente la base ante errores de migración o esquema; ahora conserva los datos y falla de forma explícita.

## [1.1.0] - 2026-08-04

### Added / Refactored
- **Tagging de Versión 1.0.0 en Git**:
  - Commiteada y etiquetada la versión `v1.0.0` como Release Candidate del sistema.
- **Refactorización del Módulo de Catálogo de Productos (Puntos 1.0 a 2.1)**:
  - **Formulario Modal Rediseñado**: Estructurado limpiamente en 2 columnas y 3 secciones (*Información General*, *Dimensiones y Cobertura*, *Precios e Inventario*).
  - **Carga de Imagen de Producto**: Input de archivo con vista previa en tiempo real y almacenamiento de `ImagenUrl` en BD.
  - **Cálculo Automático de Cobertura de Caja**: Multiplicación automática de `PiezasPorCaja` por `CoberturaUnitarioM2` dando los $m^2$ totales abarcados por caja.
  - **Campos de Dimensiones e Inventario Inicial**: Adición de `LargoCm`, `AltoCm`, `AnchoCm` y `CantidadInventarioInicial`.
  - **Registro de Stock Automático**: Inserción inmediata de existencias iniciales en la tabla `Stocks` al crear un producto.
  - **Prefijo Obligatorio SKU `"WPC-"`**: El campo SKU mantiene fijas las iniciales `"WPC-"` para estandarizar los registros.
  - **Escáner USB de Código de Barras**: Foco automático en el input de código de barras para llenado directo con escáner.
  - **Formateo de Cajas Monetarias ($)**: Corrección de ceros a la izquierda para evitar cadenas confusas como `0150`.
  - **Unidades de Medida Ampliadas**: Inclusión de `Pza`, `M2`, `ML`, `Caja`, `Kilo`, `Bolsa`, `Tubo` (pegamento) y `Juego` (pijas/clavos).
  - **Columna de Miniatura (Thumbnail) en Tabla**: Vista previa de 50x50px en la tabla de catálogo con placeholder gris/blanco para productos sin imagen.
  - **Integración con Carrito de PDV**: Visualización de miniaturas de fotos e información de cajas/cobertura en el panel de ventas.
