# Estandarización de referencias de recibo por `IdVenta`

Fecha: 2026-08-10  
Rama: `fase-1.1`  
Base validada: `AAM/PosLambrinDb`

## Convención autoritativa

- GUID: identificador técnico interno y PK/FK existente.
- `IdVenta`: folio operativo incremental de la venta.
- `RECIBO-{IdVenta}`: referencia operativa visible de recibos y movimientos de pago.

Ejemplo: una venta con `IdVenta = 47` y cualquier GUID técnico se presenta como `Venta #47` y `RECIBO-47`.

## 1. Causa identificada

`CommercialOperationsService` creaba `AbonoPago.NumeroRecibo` con el generador genérico de folios, que concatenaba fecha y un fragmento de `Guid.NewGuid()`. Además, los pagos iniciales se proyectaban como `PAGO-{IdVenta}` o `ANTICIPO-{IdVenta}`. Esto producía tres convenciones visibles distintas para una misma venta.

La columna `PaymentInstallments.NumeroRecibo` tenía un índice único. Ese constraint era incompatible con la convención solicitada porque una venta puede tener varios abonos y, por definición, todos deben utilizar el mismo `RECIBO-{IdVenta}`. La inspección real encontró tres ventas con varios abonos: `RECIBO-7` (3), `RECIBO-11` (2) y `RECIBO-31` (2).

## 2. Cambios backend

| Archivo/área | Cambio | Motivo |
| --- | --- | --- |
| `Pos.Domain/Common/ReceiptReferences.cs` | Generador y parser centralizados. | Evitar concatenaciones independientes y aceptar búsquedas por `47` o `RECIBO-47`. |
| `CommercialOperationsService` | Alta, historial de abonos, histórico de transacciones y pagos iniciales usan `ReceiptReferences.Create(IdVenta)`. | Eliminar fecha/GUID y las variantes `PAGO-`/`ANTICIPO-`. |
| `SaleApplicationService` | Detalle de venta y comprobante exponen la referencia operativa en todos los pagos. | Evitar referencias heredadas en el ticket. |
| `CashShiftApplicationService` | Los movimientos generales de abono calculan la referencia desde `IdVenta`. | Evitar mostrar un valor legado aun si existe un registro histórico sin migrar. |
| `PosDbContext` | El índice de `NumeroRecibo` pasa de único a no único. | Permitir varios abonos legítimos de una misma venta con la misma referencia operativa. |
| Entidades de pago | Comentarios actualizados a `RECIBO-{IdVenta}`. | Documentar la convención en el modelo. |

La ruta SQL Server que genera y recupera el `IDENTITY IdVenta` no fue modificada. Sólo se agregó una emulación para el proveedor no relacional InMemory de desarrollo/pruebas, que no genera ese `IDENTITY`; SQL Server continúa siendo la única fuente autoritativa en operación.

## 3. Cambios frontend

| Componente | Cambio |
| --- | --- |
| `CommercialOpsPage` | Historial y transacciones muestran la referencia devuelta por backend; el buscador indica `IdVenta` o `RECIBO-{IdVenta}`. |
| `SaleReceiptModal` | El comprobante muestra explícitamente `Referencia: RECIBO-{IdVenta}` desde `payments[].referenceNumber`. |
| `tiposVentas.ts` | Se alinea `referenceNumber` con el contrato JSON del backend. |
| i18n ES/zh-CN | Placeholder de búsqueda actualizado en ambos idiomas. |

No se construye la referencia en React; el frontend consume la referencia generada por backend.

## 4. Cambios SQL y tablas afectadas

Migración EF Core aplicada: `20260810131157_StandardizeReceiptReferencesByIdVenta`.

| Tabla | Cambio | Filas |
| --- | --- | ---: |
| `PaymentInstallments` | `NumeroRecibo` normalizado a `RECIBO-{Sales.IdVenta}`. | 11 |
| `PaymentInstallments` | `IX_PaymentInstallments_NumeroRecibo` recreado como índice no único. | Esquema |
| `CashTransactions` | Motivo de abonos normalizado a `Abono RECIBO-N de Venta #N`. | 8 |
| `AuditLogs` | Sin cambios; bitácora inmutable. | 0 |

La migración corre dentro de la transacción de EF Core, usa `XACT_ABORT`, calcula candidatos antes de actualizar, compara `@@ROWCOUNT` y lanza `THROW` ante cualquier discrepancia. Los registros que no puedan relacionarse con una venta no son actualizados.

## 5. Inventario de referencias históricas

Antes de la migración:

- Registros de `PaymentInstallments`: 11.
- Referencias antiguas con fecha/GUID: 11.
- Referencias relacionables inequívocamente: 11.
- Huérfanos: 0.
- Referencias ya operativas: 0.
- Movimientos de caja de abono vinculados: 8.
- Objetos SQL (triggers, vistas, procedimientos o funciones) que construyeran `RECIBO-`: 0.

Después de la migración:

- Referencias operativas correctas: 11/11.
- Referencias antiguas residuales en tablas operativas: 0.
- Movimientos de caja normalizados: 8/8.
- Huérfanos: 0.
- Valores repetidos legítimos: 3 (`RECIBO-7`, `RECIBO-11`, `RECIBO-31`).

Existen 11 snapshots históricos en `AuditLogs.ValoresNuevosJson` con la referencia original. No se modificaron porque la bitácora es inmutable y constituye evidencia técnica administrativa. Las pantallas operativas ya no consumen esos valores como referencia de recibo.

## 6. Compatibilidad e integridad

- Se conservan `Sales.Id`, `PaymentInstallments.Id`, `VentaId` y todas las PK/FK GUID.
- No se eliminó ninguna columna GUID ni se sustituyeron relaciones.
- `Sales.IdVenta` conserva su `IDENTITY` e índice único.
- Las consultas técnicas por GUID siguen disponibles.
- La búsqueda histórica mantiene compatibilidad textual, pero la búsqueda principal resuelve `47` y `RECIBO-47` al mismo `IdVenta`.
- No se modificaron registros de auditoría.

## 7. APIs

No se agregaron ni eliminaron rutas. Se modificó el comportamiento compatible de:

- `POST /api/v1/payments/installment`: devuelve y persiste `RECIBO-{IdVenta}`.
- `GET /api/v1/payments/sale/{idVenta:int}`: todos los pagos devuelven la referencia operativa.
- `GET /api/v1/payments/installments?search=47`.
- `GET /api/v1/payments/installments?search=RECIBO-47`.
- `GET /api/v1/payments/transactions?search=47`.
- `GET /api/v1/payments/transactions?search=RECIBO-47`.
- `GET /api/v1/sales/{idVenta:int}`: `payments[].referenceNumber` usa `RECIBO-{IdVenta}`.

Las dos variantes de búsqueda devuelven la misma operación y conservan las políticas de autorización existentes.

## 8. Pruebas y validación funcional

- Backend build Release: 0 errores / 0 advertencias.
- xUnit: 65/65 aprobadas (18 dominio, 35 aplicación, 12 integración).
- Frontend Vitest: 10/10 aprobadas.
- Frontend `tsc && vite build`: exitoso, 88 módulos transformados.
- SQL Server: migración registrada y aplicada correctamente.
- Navegador local con datos reales, sin crear operaciones ficticias:
  - Histórico de transacciones muestra pagos completos, anticipos y abonos como `RECIBO-N`.
  - Búsqueda `47`: 2 resultados.
  - Búsqueda `RECIBO-47`: los mismos 2 resultados.
  - Histórico de abonos: 0 referencias visibles con fecha/GUID.
  - Comprobante de Venta #47: `Referencia: RECIBO-47`.
  - Consola del navegador: 0 errores.

## 9. Advertencias y riesgos

- El build no emitió advertencias.
- Al iniciar el API se observaron dos advertencias EF Core preexistentes en la validación de esquema por usar `First/FirstOrDefault` sin orden explícito. No pertenecen al flujo de recibos y no se cambiaron en esta tarea acotada.
- `NumeroRecibo` ya no identifica de forma única una fila de abono; identifica operativamente a la venta. La identidad individual del movimiento continúa siendo el GUID `PaymentInstallments.Id`.
- La reversión del índice único está protegida: la migración `Down` se detiene si existen varios abonos con la misma referencia, evitando pérdida o corrupción.

## 10. Consultas SQL de validación

```sql
-- Referencias antiguas o inconsistentes relacionadas con una venta.
SELECT p.Id, s.IdVenta, p.NumeroRecibo
FROM dbo.PaymentInstallments AS p
INNER JOIN dbo.Sales AS s ON s.Id = p.VentaId
WHERE p.NumeroRecibo <> CONCAT(N'RECIBO-', CONVERT(nvarchar(20), s.IdVenta));

-- Referencias operativas y cantidad de movimientos asociados.
SELECT p.NumeroRecibo, COUNT(*) AS PaymentCount
FROM dbo.PaymentInstallments AS p
GROUP BY p.NumeroRecibo
ORDER BY p.NumeroRecibo;

-- Referencias repetidas válidas por ventas con varios abonos.
SELECT p.NumeroRecibo, COUNT(*) AS PaymentCount
FROM dbo.PaymentInstallments AS p
GROUP BY p.NumeroRecibo
HAVING COUNT(*) > 1;

-- Registros sin venta asociada.
SELECT p.*
FROM dbo.PaymentInstallments AS p
LEFT JOIN dbo.Sales AS s ON s.Id = p.VentaId
WHERE s.Id IS NULL;

-- Correspondencia referencia -> IdVenta.
SELECT s.IdVenta, p.NumeroRecibo, p.Id AS PaymentGuid, p.MontoAbonado
FROM dbo.PaymentInstallments AS p
INNER JOIN dbo.Sales AS s ON s.Id = p.VentaId
ORDER BY s.IdVenta, p.FechaCreacionUtc;

-- Movimientos de caja todavía no normalizados.
SELECT ct.Id, ct.IdVenta, ct.Motivo
FROM dbo.CashTransactions AS ct
INNER JOIN dbo.Sales AS s ON s.IdVenta = ct.IdVenta
WHERE ct.TipoTransaccion = N'Abono'
  AND ct.Motivo <> CONCAT(
      N'Abono RECIBO-', CONVERT(nvarchar(20), s.IdVenta),
      N' de Venta #', CONVERT(nvarchar(20), s.IdVenta));
```

## 11. Archivos modificados por esta estandarización

- `src/backend/Pos.Domain/Common/ReceiptReferences.cs`
- `src/backend/Pos.Domain/Entidades/AbonoPago.cs`
- `src/backend/Pos.Domain/Entities/PaymentInstallment.cs`
- `src/backend/Pos.Infrastructure/Persistence/PosDbContext.cs`
- `src/backend/Pos.Infrastructure/Persistence/Migrations/20260810131157_StandardizeReceiptReferencesByIdVenta.cs`
- `src/backend/Pos.Infrastructure/Persistence/Migrations/20260810131157_StandardizeReceiptReferencesByIdVenta.Designer.cs`
- `src/backend/Pos.Infrastructure/Persistence/Migrations/PosDbContextModelSnapshot.cs`
- `src/backend/Pos.Infrastructure/Services/CommercialOperationsService.cs`
- `src/backend/Pos.Infrastructure/Services/CashShiftApplicationService.cs`
- `src/backend/Pos.Infrastructure/Services/SaleApplicationService.cs`
- `src/frontend/pos-web/src/App.test.tsx`
- `src/frontend/pos-web/src/i18n/index.ts`
- `src/frontend/pos-web/src/pages/Commercial/CommercialOpsPage.tsx`
- `src/frontend/pos-web/src/pages/Sales/SaleReceiptModal.tsx`
- `src/frontend/pos-web/src/types/tiposVentas.ts`
- `tests/backend/Pos.Domain.Tests/Common/ReceiptReferencesTests.cs`
- `tests/backend/Pos.Application.Tests/Commercial/CommercialOperationsTests.cs`
- `tests/backend/Pos.Application.Tests/CashShift/CashShiftApplicationTests.cs`

## 12. Resumen

Se estandarizan recibos, pagos, anticipos, abonos e historiales con `RECIBO-{IdVenta}`. El GUID permanece como identidad técnica por fila y las relaciones existentes no cambian. Los 11 recibos y 8 movimientos de caja históricos fueron migrados de forma transaccional, sin huérfanos ni referencias operativas antiguas residuales.
