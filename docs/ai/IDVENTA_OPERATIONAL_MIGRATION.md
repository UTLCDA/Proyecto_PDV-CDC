# Migración funcional de GUID a `IdVenta` como folio operativo

Fecha de revisión: 2026-08-10  
Rama: `fase-1.1`  
Base inspeccionada: `AAM/PosLambrinDb`

## 1. Análisis inicial

Se inspeccionaron controladores, DTOs, servicios, entidades, mappings de EF Core, migraciones, SQL Server, pruebas y todo el frontend React.

Clasificación encontrada:

| Uso | Clasificación | Decisión |
| --- | --- | --- |
| `Sales.Id` y relaciones `VentaId` | GUID técnico | Se conserva como PK/FK y para integridad referencial. |
| Rutas `GET /sales/{guid}` | Compatibilidad técnica | Se conservan y se agrega alias explícito `by-guid`. |
| `Sales.IdVenta` | Folio operativo | Identificador principal para API operativa, búsqueda y presentación. |
| `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements`, `CashTransactions` | Referencia operativa secundaria | Se expone `IdVenta`; los GUID relacionales no cambian. |
| Historial, ticket, abonos, transacciones, devoluciones, caja, inventario, contratos y auditoría | GUID/folio técnico visible o uso de GUID desde React | Se migran a `Venta #IdVenta`. |
| `NumeroFolio` histórico | Referencia heredada | Se conserva para compatibilidad y auditoría, pero deja de ser el folio principal visible. |
| Correlation ID de bitácora | GUID técnico de trazabilidad | Se conserva visible para administradores; no es un GUID de venta. |

No existe un router de detalle de venta en el frontend, por lo que no había URLs React `/ventas/{guid}` que migrar. Reportes ejecutivos, dashboard y Corte X/Z son agregados y no listan ventas individuales. El repositorio tampoco contiene actualmente un command, endpoint o botón para cancelar una venta; únicamente existe el estado/filtro `Cancelada`. No se creó un flujo de cancelación nuevo porque excedería el objetivo de migración de identificadores.

## 2. Cambios backend

| Área/archivo | Cambio | Motivo |
| --- | --- | --- |
| `SalesController` | `GET /api/v1/sales/{idVenta:int}` como ruta operativa; rutas GUID conservadas; `Location` de POST apunta a `IdVenta`. | Evitar que el consumidor operativo necesite el GUID. |
| `PaymentsController` | Consulta de abonos mediante `/payments/sale/{idVenta:int}` y alias GUID compatible. | Selección y consulta por folio humano. |
| `ReturnsController` | Consulta por `idVenta`; `saleId` GUID sigue disponible como fallback. | Compatibilidad sin cambiar FK. |
| `AuditController` | Filtro opcional `idVenta`. | Localizar la trazabilidad funcional de una venta. |
| DTOs de ventas/comercial/caja/inventario/auditoría | Incorporación de `IdVenta`. Requests de abono y devolución aceptan `IdVenta` y mantienen GUID opcional. | Contratos amigables y transición segura. |
| `SaleApplicationService` | Búsqueda numérica exacta por índice `IdVenta`; GUID/texto solo para búsquedas no numéricas; auditoría y referencias nuevas usan `Venta #N`. | Evitar falsos positivos y mantener compatibilidad. |
| `CommercialOperationsService` | Resolución central `IdVenta -> Venta.Id`; validación cuando llegan ambos IDs; abonos, devoluciones, pagos y auditoría propagan el folio. | Mantener GUID interno sin exponerlo al flujo operativo. |
| `CashShiftApplicationService` | Movimientos de venta, abono y devolución exponen y describen `IdVenta`. | Folio legible en caja. |
| `InventoryApplicationService` | DTO y búsqueda incluyen `IdVenta`. | Trazabilidad de movimientos generados por venta. |
| `ReportingApplicationService` | Auditoría resuelve Venta/Abono/Devolución a `IdVenta` y permite filtrarlo. | Mantener el GUID de entidad solo como dato técnico. |

El mecanismo validado de generación y persistencia de `IdVenta` en `ProcessSaleAsync` no fue reimplementado ni alterado.

## 3. Cambios frontend

| Componente | Cambio |
| --- | --- |
| Punto de Venta y cotizaciones | Mensajes de éxito muestran `Venta #IdVenta`. |
| `SalesHistoryPage` | Columna principal, búsqueda y acciones utilizan `IdVenta`. |
| `SaleReceiptModal` | Ticket/comprobante imprime `Venta #IdVenta` y no el GUID. |
| `CommercialOpsPage` | Selectores, requests, consultas, historiales, comprobantes, devoluciones y variable contractual `{{FOLIO}}` usan `IdVenta`. |
| `CashShiftPage` | Nueva columna Folio; movimientos relacionados muestran `Venta #N`. |
| `InventoryMovementsPage` | Referencia de movimientos asociados muestra `Venta #N`. |
| `AuditLogPage` | Filtro por `IdVenta`, entidad visible `Venta #N` y normalización visual de notas históricas `VENTA-*` sin modificar la bitácora almacenada. |
| Servicios y tipos TypeScript | Operaciones funcionales por `IdVenta`; método `getSaleByGuid` queda explícito para compatibilidad técnica. |
| i18n ES/zh-CN | Convención `Venta #{{idVenta}}`, placeholders y mensajes operativos actualizados. |

El escaneo global de TS/TSX no encontró renderizado de `sale.id` o `venta.id`. Los campos `saleId` restantes están limitados a DTOs de respuesta compatibles y no se consumen en JSX.

## 4. Cambios SQL

La adopción inicial no modificó PK, FK ni `IDENTITY`. `Sales.IdVenta` conserva el índice único `IX_Sales_IdVenta`, verificado en SQL Server.

Se agregó la migración de datos no destructiva `BackfillOperationalSaleReferences`. Posteriormente se alineó `__EFMigrationsHistory` y la migración `20260810131157_StandardizeReceiptReferencesByIdVenta` se aplicó normalmente con EF Core. Esta última cambió únicamente `IX_PaymentInstallments_NumeroRecibo` de único a no único y normalizó referencias de recibo; no alteró relaciones GUID ni el `IDENTITY` de ventas. El detalle está en `RECEIPT_REFERENCE_MIGRATION.md`.

Resultado del saneamiento:

| Tabla/proceso | Filas actualizadas | Pendientes recuperables |
| --- | ---: | ---: |
| `InventoryMovements` de venta | 39 | 0 |
| `InventoryMovements` de devolución | 1 | 0 |
| `CashTransactions` de abonos | 6 | 0 |
| `PaymentInstallments.NumeroRecibo` | 11 | 0 |
| Motivos de caja con recibo | 8 | 0 |

Permanecen con `IdVenta NULL` 8 movimientos manuales de inventario y 22 movimientos de caja (apertura, cierre, Corte X, ingresos/retiros manuales) porque no pertenecen a una venta.

## 5. Compatibilidad

- Los GUID siguen siendo PK/FK y continúan disponibles en respuestas donde protegen compatibilidad con consumidores existentes.
- `GET /api/v1/sales/{guid}` sigue funcionando; `GET /api/v1/sales/by-guid/{guid}` hace explícito su carácter técnico.
- Abonos y devoluciones aceptan temporalmente `SaleId` GUID opcional; si también llega `IdVenta`, el backend comprueba que ambos correspondan a la misma venta.
- `NumeroFolio` permanece almacenado y disponible como referencia heredada, pero el frontend no lo usa como identificador principal.
- Los GUID de correlación de bitácora se conservan porque identifican la petición, no la venta.
- Los registros históricos de auditoría no se editaron. La UI traduce su referencia heredada al folio operativo cuando puede resolver la venta.

## 6. APIs

| Operativa/nueva | Compatibilidad técnica |
| --- | --- |
| `GET /api/v1/sales/{idVenta:int}` | `GET /api/v1/sales/{id:guid}` |
| `GET /api/v1/sales/folio/{idVenta:int}` | `GET /api/v1/sales/by-guid/{id:guid}` |
| `GET /api/v1/payments/sale/{idVenta:int}` | `GET /api/v1/payments/sale/{saleId:guid}` y `/by-guid/{saleId}` |
| `GET /api/v1/returns?idVenta=N` | `GET /api/v1/returns?saleId={guid}` |
| `GET /api/v1/audit/logs?idVenta=N` | Filtros técnicos existentes de correlación/acción/usuario |

Los POST de abono y devolución reciben `idVenta`; `saleId` se conserva opcionalmente para clientes antiguos.

## 7. Pruebas

- Build backend Release: **0 errores / 0 advertencias**.
- xUnit: **65/65** aprobadas.
- Build frontend (`tsc && vite build`): exitoso.
- Vitest: **10/10** aprobadas.
- SQL real: consulta por `IdVenta=47` y GUID recuperó la misma venta; 1/1 partidas, 2/2 abonos y 2/2 eventos de auditoría conservaron el mismo `IdVenta`; devolución de Venta #14 localizada por folio.
- Búsqueda real de `47`: devuelve únicamente Venta #47, sin coincidencias parciales contra folios técnicos.

## 8. Validación funcional

Se validaron en navegador con datos reales:

1. Historial con columna `Venta #N`.
2. Búsqueda exacta por `IdVenta`.
3. Comprobante/ticket con `Venta #N`.
4. Selectores e historial de abonos por `IdVenta`.
5. Historial y selector de devolución por `IdVenta`.
6. Movimientos generales de caja con folio operativo.
7. Movimientos de inventario con referencia operativa.
8. Auditoría filtrada por `IdVenta`, sin mostrar el GUID de entidad de la venta.
9. Compatibilidad API de consulta por GUID.

No se registraron ventas, abonos, devoluciones, cancelaciones ni cortes ficticios durante el QA de navegador.

## 9. Riesgos y pendientes

- `__EFMigrationsHistory` está alineado en la base operativa hasta `20260810131157`; sigue pendiente una migración inicial completa para crear el esquema desde una base vacía.
- La cancelación no tiene flujo implementado en el repositorio. Cuando se diseñe, debe recibir `IdVenta`, resolver internamente el GUID y mantener autorización/atomicidad.
- Corte X/Z y reportes actuales son agregados. Si después incluyen detalle por venta, cada renglón deberá usar `IdVenta`.
- La secuencia incremental es predecible; todos los endpoints conservan las políticas de autorización existentes para evitar IDOR.
- Los logs HTTP históricos pueden contener URLs GUID generadas por versiones anteriores. Son bitácora inmutable y acceso exclusivo de administración; el frontend actual ya no genera esas rutas operativas.

## 10. Resumen tipo commit/PR

Se adopta `IdVenta` como folio operativo de las ventas en los módulos del PDV, manteniendo el GUID como identificador técnico interno. Se actualizan APIs, DTOs, consultas, pantallas, búsquedas, tickets, movimientos, devoluciones, caja y auditoría para utilizar el nuevo folio sin modificar las relaciones existentes ni comprometer compatibilidad.

## Anexo A. Archivos modificados

Documentación:

- `docs/CHANGELOG.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/HANDOFF.md`
- `docs/ai/NEXT_TASK.md`
- `docs/ai/PR_DESCRIPTION.md`
- `docs/ai/IDVENTA_OPERATIONAL_MIGRATION.md`

Backend — API y contratos:

- `src/backend/Pos.Api/Controllers/v1/AuditController.cs`
- `src/backend/Pos.Api/Controllers/v1/PaymentsController.cs`
- `src/backend/Pos.Api/Controllers/v1/ReturnsController.cs`
- `src/backend/Pos.Api/Controllers/v1/SalesController.cs`
- `src/backend/Pos.Application/CashShift/DTOs/CashShiftDtos.cs`
- `src/backend/Pos.Application/Commercial/DTOs/CommercialDtos.cs`
- `src/backend/Pos.Application/Commercial/Services/ICommercialOperationsService.cs`
- `src/backend/Pos.Application/Inventory/DTOs/InventoryDtos.cs`
- `src/backend/Pos.Application/Reporting/DTOs/ReportDtos.cs`
- `src/backend/Pos.Application/Reporting/Services/IReportingApplicationService.cs`
- `src/backend/Pos.Application/Sales/DTOs/SaleDtos.cs`

Backend — implementación y datos:

- `src/backend/Pos.Infrastructure/Services/CashShiftApplicationService.cs`
- `src/backend/Pos.Infrastructure/Services/CommercialOperationsService.cs`
- `src/backend/Pos.Infrastructure/Services/InventoryApplicationService.cs`
- `src/backend/Pos.Infrastructure/Services/ReportingApplicationService.cs`
- `src/backend/Pos.Infrastructure/Services/SaleApplicationService.cs`
- `src/backend/Pos.Infrastructure/Persistence/Migrations/20260810123707_BackfillOperationalSaleReferences.cs`
- `src/backend/Pos.Infrastructure/Persistence/Migrations/20260810123707_BackfillOperationalSaleReferences.Designer.cs`

Frontend:

- `src/frontend/pos-web/src/App.test.tsx`
- `src/frontend/pos-web/src/i18n/index.ts`
- `src/frontend/pos-web/src/pages/Audit/AuditLogPage.tsx`
- `src/frontend/pos-web/src/pages/CashShift/CashShiftPage.tsx`
- `src/frontend/pos-web/src/pages/Commercial/CommercialOpsPage.tsx`
- `src/frontend/pos-web/src/pages/Inventory/InventoryMovementsPage.tsx`
- `src/frontend/pos-web/src/pages/Pos/PaginaPuntoVenta.tsx`
- `src/frontend/pos-web/src/pages/Quotes/QuoteListPage.tsx`
- `src/frontend/pos-web/src/pages/Sales/SaleReceiptModal.tsx`
- `src/frontend/pos-web/src/pages/Sales/SalesHistoryPage.tsx`
- `src/frontend/pos-web/src/services/commercialService.ts`
- `src/frontend/pos-web/src/services/reportsService.ts`
- `src/frontend/pos-web/src/services/salesService.ts`
- `src/frontend/pos-web/src/services/servicioVentas.ts`
- `src/frontend/pos-web/src/types/commercial.ts`
- `src/frontend/pos-web/src/types/inventory.ts`
- `src/frontend/pos-web/src/types/reports.ts`
- `src/frontend/pos-web/src/types/sales.ts`
- `src/frontend/pos-web/src/types/tiposVentas.ts`

Pruebas backend:

- `tests/backend/Pos.Api.IntegrationTests/Controllers/SalesControllerIntegrationTests.cs`
- `tests/backend/Pos.Application.Tests/CashShift/CashShiftApplicationTests.cs`
- `tests/backend/Pos.Application.Tests/Commercial/CommercialOperationsTests.cs`
- `tests/backend/Pos.Application.Tests/Inventory/InventoryApplicationTests.cs`
- `tests/backend/Pos.Application.Tests/Reporting/ReportingApplicationTests.cs`
- `tests/backend/Pos.Application.Tests/Sales/SaleApplicationTests.cs`
