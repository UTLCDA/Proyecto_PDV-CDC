# Completar módulos operativos de Fase 1 y aplicar identidad visual WPC Bajío

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

- Backend: 57/57; build con 0 advertencias y 0 errores.
- Integración SQL Server real: venta creada correctamente con partida, movimiento de inventario y auditoría consistentes.
- Frontend: 8/8; build de producción exitoso.
- QA visual ES/ZH y móvil 390×844 con datos reales de AAM y sin crear operaciones ficticias.
- Revalidación del tema: frontend 8/8, build web exitoso, build .NET con 0 advertencias/errores, dominio/aplicación 44/44 y revisión visual de todos los módulos en cuatro viewports.

## Pendiente para otra PR

- Crear una migración inicial/baseline que permita instalar el esquema en una base SQL Server completamente vacía.
- Promociones, entregas/envíos y exportación PDF/XLSX requieren definición funcional y constituyen la siguiente única tarea recomendada.
- Externalización de secretos y credenciales antes del despliegue productivo.
