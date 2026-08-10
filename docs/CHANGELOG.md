# CHANGELOG — WPC Bajío POS & Platform

All notable changes to this project will be documented in this file.

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
