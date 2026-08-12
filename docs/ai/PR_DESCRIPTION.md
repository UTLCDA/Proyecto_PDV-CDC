# Completar módulos operativos de Fase 1 y aplicar identidad visual WPC Bajío

## Actualización: referencias de recibo por `IdVenta`

- Estandariza pagos completos, anticipos, abonos, históricos y comprobantes con `RECIBO-{IdVenta}`.
- Centraliza creación y parsing en `ReceiptReferences`; `47` y `RECIBO-47` producen resultados equivalentes.
- Migra transaccionalmente 11 recibos y 8 movimientos de caja, sin huérfanos ni formatos antiguos residuales en tablas operativas.
- Convierte el índice de `PaymentInstallments.NumeroRecibo` a no único para soportar varios abonos de una venta; los GUID permanecen como PK/FK e identidad individual.
- Conserva intacta la bitácora histórica y la generación SQL Server `IDENTITY` de `IdVenta`.
- Validación: backend 65/65, frontend 10/10, builds aprobados y QA local del histórico/comprobante sin errores de consola.

## Actualización: `IdVenta` como identificador operativo

- Adopta la convención uniforme `Venta #IdVenta` en historial, ticket, PDV, cotizaciones, abonos, transacciones, devoluciones, contratos, caja, inventario y auditoría.
- Expone rutas operativas por entero y conserva GUID como PK/FK y contrato técnico compatible.
- Resuelve `IdVenta -> GUID` dentro de servicios de abonos/devoluciones sin reemplazar relaciones existentes.
- Hace exactas las búsquedas numéricas por el índice único `Sales.IdVenta`.
- Completa referencias históricas verificables mediante una migración de datos idempotente y no destructiva.
- Validación acumulada: backend 65/65, frontend 10/10, ambos builds aprobados y QA con SQL Server real.
- No modifica el mecanismo validado que genera/persiste `IdVenta`; no crea un flujo de cancelación inexistente.

## Resumen

Completa y conecta con datos reales los módulos existentes de seguridad, caja, ventas, clientes, catálogo, inventario, cotizaciones, abonos, devoluciones, contratos, reportes y auditoría. Elimina respaldos ficticios y refuerza permisos, transacciones, validaciones e índices SQL.

Además, migra todo el frontend al Design System claro aprobado por WPC Bajío sin modificar comportamiento funcional.

## Identidad visual

- Paleta oficial centralizada en `src/frontend/pos-web/src/index.css` y consumida mediante variables CSS.
- Logo aprobado en login y encabezado; usuario y rol visibles en navegación.
- Contenedores crema para Catálogo rápido y Carrito; superficies internas blancas, primario terracota y estados semánticos accesibles.
- Todos los módulos, tablas, formularios, modales y estados interactivos migrados sin HEX/RGB en componentes o CSS de módulo.
- Responsive comprobado en 1920×1080, 1440×900, 1366×768 y 768×1024 sin overflow horizontal.
- Sin cambios de endpoints, API, lógica, servicios, modelos, rutas, permisos, validaciones, cálculos ni base de datos por la migración visual.

## Cambios principales

- Corrige la persistencia relacional de ventas con `IdVenta`: elimina la reinserción de entidades con GUID duplicados, recupera el identity por GUID dentro de la transacción y propaga el folio mediante actualizaciones directas.
- Deshabilita MARS en la conexión operativa para recuperar los savepoints de EF Core durante las transacciones reintentables.
- Cajero limitado al PDV; administración real de usuarios, roles y matriz de 26 permisos.
- Caja con Corte X/Z, retiros, historial y cálculos por turno real.
- PDV con precios autoritativos, mayoreo, IVA, descuentos, stock, pago mixto/anticipo, historial y comprobante.
- Transacciones de ventas y operaciones posventa compatibles con la estrategia de reintentos de SQL Server.
- Clientes validados; cotizaciones atómicas; abonos y devoluciones transaccionales; plantillas contractuales seguras.
- Inventario con escáner, ubicaciones, antes/después, imágenes y evidencia física en visor modal.
- Reportes reales de ventas netas, devoluciones, cobros, productos, inventario y bitácora filtrable.
- Catálogo reforzado con validaciones de negocio e índices únicos de SKU, código de barras, slug y stock por producto.
- Arranque relacional corregido para aplicar migraciones sin `EnsureCreated` previo.

## Base de datos

- Migraciones nuevas: `CompleteCommercialOperations`, `CompleteReportsAndCatalog` y `NormalizeDefaultWarehouseLocation`.
- Las seis migraciones del repositorio están aplicadas en `AAM/PosLambrinDb`.
- Se verificaron datos existentes antes de aplicar longitudes e índices únicos.

## Pruebas

- Backend: 65/65; build con 0 advertencias y 0 errores.
- Integración SQL Server real: venta creada correctamente con partida, movimiento de inventario y auditoría consistentes.
- Frontend: 10/10; build de producción exitoso.
- QA visual ES/ZH y móvil 390×844 con datos reales de AAM y sin crear operaciones ficticias.
- Revalidación del tema: frontend 8/8, build web exitoso, build .NET con 0 advertencias/errores, dominio/aplicación 44/44 y revisión visual de todos los módulos en cuatro viewports.

## Pendiente para otra PR

- Crear una migración inicial/baseline que permita instalar el esquema en una base SQL Server completamente vacía.
- Promociones, entregas/envíos y exportación PDF/XLSX requieren definición funcional y constituyen la siguiente única tarea recomendada.
- Externalización de secretos y credenciales antes del despliegue productivo.
