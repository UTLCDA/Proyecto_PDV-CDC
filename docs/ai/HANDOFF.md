# HANDOFF — Liberación Oficial Versión 2.0.0 (Sistema PDV e Inventario WPC Bajío)

## Refinamiento visual posterior a exportaciones (2026-08-17)

- El filtro de Movimientos de Inventario ya no presenta dos fechas anónimas: incorpora un bloque visual de periodo con etiquetas explícitas, límites cruzados y apilado móvil.
- Histórico de Ventas ahora presenta título/exportaciones en una fila estable y filtros en una segunda fila responsive.
- Se retiró el contador numérico aislado del encabezado de Histórico de Transacciones porque no explicaba su significado.
- Directorio de Clientes dejó de comprimir cuatro grupos de acciones en 520 px; buscador, estado, alta y exportaciones usan un grid adaptable.
- Los errores al crear/editar usuarios se muestran dentro del modal, no detrás del overlay.
- La contraseña cuenta con indicadores en tiempo real para longitud, mayúscula, minúscula, número y símbolo; requisitos cumplidos aparecen en verde y el guardado se habilita sólo cuando la política coincide con backend.
- Nueva prueba `passwordValidation.test.ts`, incluyendo caracteres Unicode conforme a `char.IsUpper`/`char.IsLower` del servicio .NET.
- Validación: frontend Vitest **21/21**, build Vite correcto (260 módulos); backend xUnit **67/67** y build Release **0 advertencias / 0 errores**.
- La entrega y sus refinamientos visuales fueron aprobados por el desarrollador responsable, quien autorizó su publicación en GitHub.

## Iteración completada en código (2026-08-17): exportación administrativa PDF/XLSX

- Rama aislada `codex/exportacion-pdf-excel`, creada desde `fase-1.1` (`5299f93`) antes de implementar.
- `ExportButtons` concentra los estados de PDF/Excel, bloqueo sin datos, carga, errores y descarga; cada módulo aporta solamente configuración tipada y acceso al conjunto filtrado.
- PDF mediante `@react-pdf/renderer`: logo oficial, encabezado, módulo, fecha, filtros aplicados, tabla administrativa con encabezados repetidos, orientación configurable y páginas numeradas.
- XLSX mediante `ExcelJS`: valores numéricos/fechas reales, moneda/porcentaje, autofiltro, encabezado congelado, anchos, wrapping, bordes y paleta WPC Bajío.
- Integrado en ventas, clientes, productos, existencias, movimientos de inventario, cotizaciones, abonos, pagos/transacciones, devoluciones, caja, reportes, usuarios, roles y auditoría.
- Los endpoints existentes aceptan opcionalmente `page` y `pageSize`. La SPA recupera lotes de 500 con los filtros y permisos vigentes; no exporta sólo la página visible ni realiza una petición gigante.
- Día operativo calculado con `America/Mexico_City`; los archivos reflejan los últimos filtros realmente consultados.
- Se excluyen acciones UI, GUID técnicos, claims, códigos de permisos, tokens, imágenes Base64 y demás datos no funcionales.
- Sin cambios de esquema/migraciones SQL, PK/FK, generación de `IdVenta` ni reglas comerciales.
- Validación acumulada previa al cierre: xUnit **67/67**, Vitest **21/21**, builds Release/Vite correctos y dependencias de producción sin vulnerabilidades.
- Diseño y matriz de módulos: `docs/ai/EXPORTACION_PDF_EXCEL.md`. Descripción de entrega: `docs/ai/PR_EXPORTACION_PDF_EXCEL.md`.

## Corrección completada (2026-08-17): comprobante histórico por movimiento seleccionado

- Causa raíz: la tabla dedicada de **Histórico de Transacciones y Movimientos de Pago** abría el comprobante enviando únicamente `IdVenta`, aunque las demás tablas ya enviaban también el identificador y la fecha del pago. Por ello el modal mostraba el estado final de la venta en vez de la fotografía del movimiento seleccionado.
- `paymentReceiptArguments` centraliza los tres argumentos requeridos (`idVenta`, `targetPaymentId`, `cutoffDate`) y se utiliza en todas las acciones de recibo de abonos y transacciones.
- QA real en Venta #49: la fila del 12-ago-2026 02:14 muestra sólo **$42.83** y saldo **$1,000.01**; la fila de las 02:42 muestra **$42.83 + $10.00** y saldo **$990.01**.
- Validación: frontend Vitest **11/11**, build Vite exitoso (91 módulos), backend xUnit **66/66** y build Release .NET con **0 advertencias / 0 errores**.
- Sin cambios de API, backend, base de datos, relaciones GUID ni generación de `IdVenta`.

## Liberación Oficial Versión 2.0.0 (2026-08-12): IVA Transparente, Tabla de Amortización, Hora Local UTC-6 y Clientes

- **Versión 2.0.0**: Marcado y empaquetado oficial del sistema con validación operativa aprobada.
- **Cálculo de IVA Transparente**: `MontoIva` al 16% sobre `SubTotal` base de productos sin reducir la base gravable por descuentos (`SubTotal * 0.16`). En la Venta #48 ($899 subtotal, $100 descuento), el IVA es $143.84 y Total es $942.84.
- **Formato UTC e Inserción Local (-06:00 CT)**: Fechas serializadas en ISO 8601 UTC (`yyyy-MM-ddTHH:mm:ss.fffZ`) y convertidas a la hora local real del cliente en Guadalajara (-06:00 CT, ej. 02:35 AM), sin alterar registros históricos en la BD.
- **Tabla de Amortización de Abonos e Histórico Transaccional**: Inclusión de `.Include(s => s.Abonos)` en backend (`GetInstallmentHistoryAsync`, `GetInstallmentsBySaleReferenceAsync` y `GetPaymentTransactionsAsync`), permitiendo el cálculo dinámico del Anticipo Inicial ($6.00) y Saldo Pendiente resultante ($400.00).
- **Regla `<HistoricoAbonosCorrectoComprobante>` por Auditoría**: `SaleReceiptModal` con `targetPaymentId` y rebanado por índice (`slice(0, targetIdx + 1)`), garantizando que los comprobantes muestren la foto acumulada exacta hasta el abono consultado.
- **Directorio de Clientes**: Teléfono restringido a dígitos numéricos (`0-9`); modal reordenado solicitando CP primero y autocompletando automáticamente Ciudad y Estado mediante `servicioCodigoPostal.ts`.
- **Validación de Código**: Backend xUnit **54/54** (Domain 19/19 y Application 35/35); Frontend Vitest **10/10**; `npm run build` Vite producción exitoso con 0 errores (90 módulos).

## Iteración completada (2026-08-10): recibos `RECIBO-{IdVenta}`

- Se eliminó la generación operativa `RECIBO-fecha-fragmentoGUID` y las variantes visibles `PAGO-IdVenta`/`ANTICIPO-IdVenta`.
- `ReceiptReferences` centraliza creación y parsing; las búsquedas `47` y `RECIBO-47` son equivalentes.
- Abonos, histórico de pagos/transacciones, movimientos generales y comprobante muestran `RECIBO-{IdVenta}`.
- La migración `20260810131157_StandardizeReceiptReferencesByIdVenta` fue aplicada con EF Core: 11/11 recibos y 8/8 movimientos de caja normalizados; 0 huérfanos y 0 referencias antiguas operativas.
- El índice de `NumeroRecibo` es no único porque las ventas 7, 11 y 31 tienen varios abonos legítimos con una misma referencia; cada abono conserva su GUID como identidad individual.
- Los 11 snapshots históricos originales permanecen únicamente en `AuditLogs` por la regla de bitácora inmutable.
- SQL Server sigue generando autoritativamente `Sales.IdVenta`; la ruta relacional validada no fue reimplementada.
- Validación: backend 65/65, frontend 10/10, builds sin errores, comprobante de Venta #47 con `RECIBO-47`, búsquedas equivalentes y consola web sin errores.
- Detalle y SQL de validación: `docs/ai/RECEIPT_REFERENCE_MIGRATION.md`.

## Iteración completada (2026-08-10): `IdVenta` como folio operativo integral

- Se recorrieron backend, API, frontend, EF Core, SQL Server, pruebas y documentación para clasificar GUID técnico versus `IdVenta` operativo.
- Historial, comprobante, PDV, cotizaciones convertidas, abonos, transacciones, devoluciones, contratos, movimientos de caja/inventario y auditoría muestran `Venta #IdVenta`.
- El frontend dejó de enviar GUID en abonos/devoluciones y consulta comprobantes mediante `IdVenta`.
- La API principal es `GET /api/v1/sales/{idVenta:int}`; rutas GUID y propiedades técnicas se conservan para compatibilidad, sin cambiar PK/FK.
- Búsquedas numéricas son exactas por `IdVenta`, evitando coincidencias parciales contra `NumeroFolio` heredado.
- Se creó `20260810123707_BackfillOperationalSaleReferences` y se aplicó su SQL idempotente de forma acotada: 39 movimientos de venta, 1 devolución y 6 abonos; 0 relaciones recuperables pendientes.
- En ese corte, el SQL del backfill se aplicó de forma acotada. Después se alineó `__EFMigrationsHistory`; actualmente la base operativa registra las migraciones hasta `20260810131157_StandardizeReceiptReferencesByIdVenta`. El baseline para una base vacía sigue pendiente.
- QA real aprobado: Venta #47 en historial/ticket/búsqueda/abonos/caja/auditoría; Venta #14 en devolución; consultas por GUID e `IdVenta` equivalentes.
- Validación automatizada de ese corte: backend **58/58**, frontend **9/9**, build Release .NET con 0 advertencias/errores y build Vite exitoso; la validación acumulada actual es 65/65 y 10/10.
- No existe actualmente una acción de cancelación; no se inventó ese flujo durante esta migración. Reportes y Corte X/Z son agregados sin filas individuales de venta.
- Detalle completo: `docs/ai/IDVENTA_OPERATIONAL_MIGRATION.md`.

## Corrección transaccional validada por el desarrollador humano (2026-08-10)

- Se diagnosticó que `ProcessSaleAsync` ejecutaba dos veces `SaveChangesAsync(acceptAllChangesOnSuccess: false)` dentro de la estrategia reintentable. Al conservar las entidades con estado `Added`, el segundo guardado intentaba reinsertar los mismos GUID y generaba errores de Primary Key.
- Se eliminó la segunda inserción. Después del único guardado, `IdVenta` se propaga con `ExecuteUpdateAsync` a `SaleItems` e `InventoryMovements` dentro de la misma transacción.
- SQL Server sí devolvía `IdVenta` mediante `OUTPUT INSERTED`, pero `SaveChangesAsync(false)` podía mantener ese valor generado pendiente de promoción. Ahora el servicio consulta el folio por el GUID de la venta dentro de la misma transacción y utiliza ese valor autoritativo.
- Se retiró `MultipleActiveResultSets=true` de `appsettings.json`; la conexión operativa vuelve a permitir savepoints de EF Core y deja de emitir `SavepointsDisabledBecauseOfMARS` después de reiniciar el API.
- La cantidad de filas actualizadas debe coincidir con las partidas y movimientos rastreados; cualquier diferencia revierte la venta completa.
- La venta fallida reportada no dejó venta, partida ni movimiento parcial en SQL Server.
- Validación técnica: build Release sin errores ni advertencias y backend **57/57** en esa iteración.
- La validación operativa posterior fue aprobada explícitamente: la venta se persistió una vez y el folio fue generado correctamente.

## Iteración completada (2026-08-10): Incorporación del Folio Operativo `IdVenta` (Rama `fase-1.1`)

1. **🆔 Folio Operativo Numérico Consecutivo `IdVenta`**:
   - Incorporada la columna `IdVenta INT IDENTITY(1,1) NOT NULL` con índice `UNIQUE` en la tabla principal de ventas `Sales`.
   - Propagación aditiva de `IdVenta INT NULL` en tablas secundarias relacionadas: `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements` y `CashTransactions`.
   - Mantenimiento estricto al 100% de los identificadores `Id` GUID, Primary Keys y Foreign Keys sin modificaciones ni reemplazos.
   - Script de datos histórico aplicado automáticamente durante la migración EF Core `20260810111538_AddIdVentaOperationalFolio`.
   - Asignación de consecutivo concurrente autoritativa administrada exclusivamente por SQL Server.
   - Generación de nuevo endpoint `GET /api/v1/sales/folio/{idVenta:int}` manteniendo intactos los endpoints por GUID.
   - Formateo y visualización en el frontend de `Folio #00000157` en la tabla de historial de ventas y comprobantes.

2. **Resultado de Pruebas, Compilación y Verificación**:
   - **Backend Build**: Solución `Pos.slnx` compila con **0 advertencias / 0 errores**.
   - **Backend Unit & Integration Tests**: **56/56** pruebas xUnit aprobadas al 100%.
   - **Frontend Build**: `tsc && vite build` finalizado con éxito (88 módulos transformados).
   - **Frontend Unit Tests**: **8/8** pruebas Vitest aprobadas al 100%.
   - **Validación del Desarrollador Humano**: 100% de la funcionalidad validada y aprobada explícitamente.

---

# HANDOFF — Cierre de módulos operativos existentes

## Migración visual completa: identidad WPC Bajío

- Se reemplazó el tema oscuro/azul por la paleta clara oficial y cálida del cliente en todos los módulos existentes.
- `src/frontend/pos-web/src/index.css` concentra la paleta, estados semánticos, focus ring, sombras, radios y alias usados por estilos heredados; el escaneo de código no encontró HEX/RGB fuera de ese archivo.
- Se incorporó el logo aprobado en login y encabezado, y el header muestra nombre y rol del usuario sin alterar sesión ni permisos.
- Catálogo rápido y Carrito de Venta usan contenedores crema perceptibles; sus cards, campos y filas internas permanecen blancos. Botones, buscador, totales, navegación activa, tablas y modales siguen la paleta aprobada.
- Se revisaron Caja, Reportes, Cotizaciones, Abonos/Contratos, Catálogo, Inventario, Clientes y Usuarios, incluidos formularios, estados y overlays.
- QA visual aprobada a 1920×1080, 1440×900, 1366×768 y 768×1024, sin overflow horizontal ni errores de consola. El modal de movimiento conserva el combo dentro de sus límites y el visor de evidencia abre dentro de la aplicación.
- Validación: frontend 8/8 y build exitoso; backend build con 0 advertencias/errores y pruebas seguras de dominio/aplicación 44/44. No se ejecutó la suite de integración en esta revalidación porque genera ventas reales contra la base configurada.
- No se modificaron lógica de negocio, endpoints, servicios, modelos, rutas, permisos, cálculos, flujos ni base de datos como parte de este cambio visual.

## Nota operativa del API

- El error `Failed to bind to address http://127.0.0.1:5000: address already in use` correspondió a dos instancias simultáneas. Se detuvo únicamente la instancia temporal de QA y se confirmó el puerto 5000 libre.

## Corrección posterior: transacciones SQL Server reintentables

- Se corrigió el error `SqlServerRetryingExecutionStrategy does not support user-initiated transactions` al procesar ventas.
- Venta, partidas, descuento de existencias y movimientos se guardan mediante la estrategia retornada por `Database.CreateExecutionStrategy()`; la verificación por ID evita duplicar la venta ante un resultado de commit incierto.
- Conversión de cotizaciones, abonos y devoluciones usan el mismo límite transaccional reintentable para no presentar el error en operaciones comerciales relacionadas.
- Build backend sin advertencias/errores y suite completa 56/56. La prueba de venta ejecutada contra SQL Server AAM fue aprobada con folio `VENTA-20260805-E9144D2EB69B4`; SQL confirmó una partida, un movimiento y una auditoría.
- Una prueba aislada sobre una base temporal vacía reveló que falta una migración inicial completa. La base temporal se eliminó; `PosLambrinDb` no fue alterada por esa prueba. Crear el baseline reproducible es ahora la siguiente tarea prioritaria.

## Iteración completada: clientes, comercial, reportes y catálogo

- Clientes valida sesión activa, correo/RFC únicos, teléfono, CP, tipo, descuento, longitudes y estado; cada cambio queda auditado.
- Cotizaciones usa precios del servidor, vigencia y folio único; la conversión reclama la cotización atómicamente para impedir ventas duplicadas.
- Abonos rechaza sobrepagos, actualiza saldo/estado, genera recibo único y afecta caja por método.
- Devoluciones valida partidas/cantidades acumuladas, calcula reembolso proporcional, resta primero saldo pendiente, restituye stock y registra caja/auditoría en transacción.
- Plantillas contractuales tienen CRUD real, contenido de texto seguro, vista previa e impresión; se eliminaron plantillas ficticias.
- Reportes elimina cifras simuladas y presenta venta bruta/devoluciones/neta, cobros, ranking neto, resumen de inventario y bitácora filtrable.
- Auditoría de base requiere `usuarios:administrar`; un permiso de reporte de inventario no expone ventas ni bitácora.
- Catálogo valida SKU `WPC-`, código de barras, categoría activa, precios, unidades, dimensiones, imágenes y usuario; crea stock en la bodega temporal aprobada.
- Inventario ya no sustituye errores de API con existencias ficticias y oculta captura a quien no posee `inventario:movimientos`.

## Migraciones y validación

- `20260805092442_CompleteCommercialOperations`: folios/constraints comerciales y permisos.
- `20260805095319_CompleteReportsAndCatalog`: unicidad de SKU, barcode, slug y stock; índices de auditoría.
- `20260805095914_NormalizeDefaultWarehouseLocation`: normaliza `Almacén Principal` a `Bodega Adolfo Lopez Mateos`.
- Las seis migraciones están registradas en `AAM/PosLambrinDb`; índices y ubicaciones fueron verificados con SQL.
- Backend 56/56, frontend 8/8 y ambos builds sin errores; .NET con 0 advertencias.
- QA de Reportes e Inventario con datos reales, ES/ZH y 390×844 sin overflow. No se insertaron operaciones comerciales de prueba.

## Decisiones pendientes

- Promociones necesita reglas aprobadas de alcance, prioridad y acumulación antes de afectar el cálculo autoritativo de ventas.
- Entregas/envíos y exportación PDF/XLSX aún no existen y forman la siguiente iteración.
- Secretos JWT, credenciales iniciales y Serilog deben salir de configuración/código versionado antes de producción.

---

# Iteración anterior — Ventas y Punto de Venta

## Iteración completada: Ventas/PDV
- El servidor es la autoridad de precios: ignora `UnitPrice` del cliente y aplica menudeo o mayoreo según cantidad/tipo de cliente.
- Valida usuario activo, cliente, producto activo, exclusión de productos sólo-cotización, cantidades, stock, descuentos y coherencia del pago.
- Los descuentos manuales requieren `ventas:descuento`; el descuento especial del cliente se aplica automáticamente.
- Venta, partidas, reducción de stock y movimientos se persisten dentro de una transacción SQL; los conflictos de concurrencia producen un error legible.
- Efectivo total, pago mixto y anticipo tienen reglas independientes. El anticipo exige cliente y deja saldo pendiente.
- Folios de venta y turnos usan valores resistentes a concurrencia e índices únicos mediante `20260805085801_AddUniqueOperationalFolios`.
- El catálogo entrega `AvailableQuantity`; el PDV muestra stock, mayoreo, IVA 16%, cobertura, historial y comprobante imprimible ES/ZH.

## Validación
- Backend 44/44; frontend 7/7; build web y .NET sin errores ni advertencias.
- SQL Server AAM registra las tres migraciones y confirmó índices únicos de folios.
- QA de navegador en escritorio y 390×844, sin confirmar ventas ficticias.

---

# Iteración anterior — Caja y Arqueos

## Iteración completada: Caja
- Corregido el cierre que comparaba `sale.FechaCreacionUtc >= sale.FechaCreacionUtc` y sumaba ventas históricas. Ahora usa el intervalo real del turno y excluye ventas canceladas/inactivas.
- Corte X disponible en `POST /api/v1/cashshifts/x-report`: actualiza efectivo, tarjeta, transferencia, retiros y esperado sin cerrar.
- Corte Z valida conteo no negativo y exige justificación cuando la diferencia supera un centavo.
- Retiros exigen motivo y no pueden superar el efectivo esperado disponible.
- Apertura, retiro, cierre y Corte/Historial exigen permisos específicos; lectura del turno usa una política compuesta de Caja.
- Transacciones de retiro/cierre se registran explícitamente como nuevas filas, evitando que EF intente actualizar entidades inexistentes.
- Pantalla completa con métricas, movimientos, historial, confirmación de Corte Z, estados inline y traducción ES/ZH.
- Navegación global responsive sin desbordamiento horizontal del documento; menús desplazables por toque sin barras visibles.

## Validación
- Backend 40/40; frontend 6/6; build .NET y producción web exitosos.
- Pruebas cubren rango de ventas, ventas canceladas/inactivas, retiro excesivo, justificación de diferencia, Corte X y granularidad de permisos.
- QA en navegador y SQL Server real sin abrir/cerrar turnos ficticios.

---

# Iteración anterior — Usuarios, Roles y Permisos

## Iteración completada: administración de seguridad
- API nueva `/api/v1/roles` para consultar roles, catálogo de permisos, crear roles personalizados y actualizar asignaciones.
- `CreateUserRequestDto` y `UpdateUserRequestDto` utilizan `RoleId`; un rol inexistente o inactivo devuelve `400` y nunca se sustituye silenciosamente.
- Administrador y Cajero son roles protegidos. Para combinaciones distintas debe crearse un rol personalizado.
- No se permite desactivar un rol con usuarios activos, desactivar/cambiar el rol de la propia sesión ni dejar el sistema sin administrador activo.
- Cambios de rol, contraseña o estado revocan refresh tokens; access tokens se limitaron a 30 minutos y el frontend implementa renovación coordinada.
- La pantalla de Usuarios ahora incluye búsqueda, estados, selector dinámico de rol, pestaña de Roles y matriz de 24 permisos agrupados por módulo.
- Interfaz ES/ZH, responsive y sin credenciales del tablero de logs embebidas en tooltips del frontend.

## Validación
- Backend: 35/35 pruebas aprobadas y build con 0 advertencias/errores.
- Frontend: 5/5 pruebas y build de producción exitosos.
- Navegador + SQL Server real: 2 usuarios, Administrador con 24 permisos y Cajero con 3; alta y matrices verificadas sin persistir datos ficticios.
- Modal validado a 390×844; el diálogo cabe en el viewport y bloquea el desplazamiento de la página de fondo.

---

## Iteración previa: restricción de Cajero al Punto de Venta

## Iteración de Autorización posterior a v1.2.0
- El menú ahora se construye con los permisos devueltos por login; un Cajero sólo ve **🛒 Punto de Venta** y su perfil.
- Al cambiar de Administrador a Cajero, la pestaña activa se restablece y nunca monta en segundo plano un módulo restringido.
- El acceso a Serilog UI sólo se muestra a usuarios con `usuarios:administrar`.
- La API registra políticas para las 24 claves de permiso y protege controladores/acciones con el permiso correspondiente.
- El rol Cajero conserva `ventas:procesar`, `catalogo:productos_ver` y `clientes:ver`, suficientes para cargar y operar el PDV.
- La migración `20260805071520_RestrictCashierToPointOfSale` fue aplicada a `AAM/PosLambrinDb` y ajustó también usuarios existentes.
- Los tokens y datos de sesión emitidos antes de la migración conservan permisos anteriores; se requiere cerrar sesión y volver a ingresar.

## Validación
- Backend: 29/29 pruebas aprobadas; build Debug con 0 advertencias y 0 errores.
- Frontend: 4/4 pruebas aprobadas; build de producción exitoso.
- Prueba de API: Cajero recibe `200` en dependencias del PDV y `403` en Inventario, Usuarios y Reportes.
- Consulta SQL: el rol Cajero tiene exactamente tres permisos.

---

## Implementación Realizada
1. **Modal de movimientos**
   - Ancho responsivo; los combos permanecen dentro del modal.
   - Producto, cantidad, motivo y documento se reinician vacíos al abrir.
   - Cantidad administrada como texto durante la edición para permitir borrado completo y validada al enviar.
   - Motivo convertido a `textarea` multilinea.
   - Ubicación editable con valor temporal `Bodega Adolfo Lopez Mateos` y persistencia en `Stocks`.

2. **Tabla de existencias**
   - Nueva miniatura de producto, reutilizando `ProductImageUrl` del catálogo.
   - Placeholder visible cuando el producto no tiene imagen.
   - Búsqueda por nombre, SKU o código de barras; el lector USB filtra inmediatamente al recibir `Enter`.

3. **Historial de movimientos**
   - Tipos traducidos a español/chino.
   - Colores: Entrada verde, Salida roja, Ajuste cian y Venta amarilla.
   - Columnas `Cantidad Anterior` y `Cantidad Nueva` colocadas junto a `Cantidad` para mostrar claramente el antes/después.
   - Columna `Evidencia` con miniatura cuando existe una foto asociada.
   - La miniatura abre un visor modal responsivo dentro del módulo; no navega a una pestaña vacía y puede cerrarse con `×`, clic en el fondo o `Esc`.

4. **Evidencia física y API**
   - Una imagen opcional por movimiento, máximo 2 MB, validada como `data:image/*`.
   - `RegisterMovementDto` y `InventoryMovementDto` incluyen `EvidenceImageUrl`.
   - `MovimientoInventario` persiste `EvidenceImageUrl`; la bitácora registra únicamente `TieneEvidenciaFisica`.
   - Migración incremental `20260804135557_AddInventoryMovementEvidenceImage` aplicada y verificada en `PosLambrinDb`.
   - El arranque ya no elimina/recrea la base ante fallos de esquema; registra el error crítico y conserva los datos para diagnóstico.

## Pruebas y Operación
- Backend: 27/27 pruebas aprobadas en `Release`.
- Frontend: 2/2 pruebas aprobadas y build de producción exitoso.
- API `Debug` recompilada sin advertencias; la instancia temporal usada en QA se detuvo y el puerto 5000 quedó libre.
- Contrato de la API viva verificado: expone `previousQuantity`, `newQuantity` y `evidenceImageUrl`.
- QA visual en navegador local completado sin errores de consola. El visor mostró la evidencia completa, no abrió pestañas adicionales y cerró correctamente con botón y `Esc`.

## Decisiones Pendientes
- La fase actual admite una foto por movimiento. Evaluar almacenamiento de múltiples evidencias/archivos fuera de SQL Server cuando aumente el volumen.
- Diseñar catálogo de almacenes y transferencias antes de reemplazar la ubicación temporal.
