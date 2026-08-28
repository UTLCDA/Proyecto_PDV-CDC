# HANDOFF — Resumen de Trabajo Reciente (v2.2.0 - Final PR)

## Fecha de Handoff
2026-08-28

## Rama Git Activa
`version-final-de-PR`

## Resumen de Cambios Realizados
1. **Punto de Venta (PDV)**:
   - Botones rápidos renombrados a `Pieza +` y `Caja +`.
   - Filtro de búsqueda rápida integrado arriba de `📦 Catálogo rápido`.
   - Desglose detallado de piezas, cajas y m² en el carrito (`23 Pzas (2 Cjas + 3 Pzas) · $290.00 · 10.01 m²`).
   - Cobertura corregida para multiplicar la cantidad por la cobertura por pieza (`coveragePerUnitSqM`).
   - Incorporación de **Calculadora de m² de Lambrín** en la tarjeta de cobro (`pos-checkout`) con cálculo automático de piezas/cajas y adición en 1 clic.
   - Modal rápido para alta de clientes directamente desde caja por cajeros.
   - Incrementadas imágenes de tarjetas de 62px a 92px.
2. **Catálogo de Productos y Costo Neto**:
   - Inclusión del campo `Costo Neto / Inicial ($ MXN)` en el modal de alta/edición de productos.
   - Persistencia de `CostoUnitario` que alimenta Costo Neto (COGS) y Ganancia en los Movimientos de Inventario.
   - Encabezados bilingües en la tabla del catálogo (`Precio Menudeo / 零售价` y `Precio Mayoreo / 批发价`).
3. **Control de Clientes y Límites Diarios**:
   - Permiso `clientes:limite_diario` y campo `LimiteCajasDiarias` en entidad `Cliente`.
   - Validación autoritativa en `SaleApplicationService` que impide rebasar el límite diario de cajas.
   - Modal de Historial de Compras de Cliente para consulta de cajeros y administradores.
4. **Movimientos de Inventario, Turnos de Caja y Reportería Bilingüe**:
   - Folio limpio `Venta #X` en la columna Motivo de Movimientos de Inventario y folios secuenciales `CAJA-YYYYMMDD-1` en la tarjeta de caja (`cash-card`), turnos de caja, listado de historial y bitácora de auditoría.
   - Cancelación de Ventas restringida a Administradores (`ventas:cancelar`), con reintegración automática de existencias a `Stocks` y sincronización en tiempo real con el esperado del Corte de Caja.
   - Impuesto ajustado a `$0.00` para ventas no facturadas.
   - Exportaciones PDF y Excel con 100% de encabezados bilingües en Español y Chino Simplificado, con registro singleton de fuentes CJK para exportaciones de alto rendimiento en milisegundos.

## Estado de la Suite de Pruebas
- Frontend Vitest: **24/24** pasadas (100%).
- Frontend Build (Vite & tsc): Exitosa con **0 errores**.
- Backend xUnit: **67/67** pasadas (100%).
- Migración EF Core: `20260828020937_AddCustomerDailyLimitAndProductCost` aplicada.
