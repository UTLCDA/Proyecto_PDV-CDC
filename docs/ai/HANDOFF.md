# HANDOFF — Resumen de Trabajo Reciente (HotFix de Imágenes en version-final-de-PR)

## Fecha de Handoff
2026-09-07

## Rama Git Activa
`version-final-de-PR` (con HotFix integrado)

## Resumen del HotFix Realizado
1. **Soporte de Imágenes HEIC / HEIF**:
   - Integrada librería `heic2any` con importación dinámica para convertir fotos tomadas en iPhones/iPads a JPEG automáticamente en el cliente sin bloquear la carga.
2. **Compresión Canvas y Eliminación del Límite de 2 MB**:
   - Creación de utilidad reutilizable [`imageProcessor.ts`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/utils/imageProcessor.ts) que redimensiona fotos a máximo 1200px y las comprime a JPEG calidad 82%.
   - Fotos pesadas de 5 MB a 20 MB se comprimen a ~100–250 KB en Base64, evitando errores de memoria, límites de red y saturación de la base de datos.
3. **Edición y Reemplazo de Imágenes en Productos**:
   - En [`PaginaCatalogoProductos.tsx`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/pages/Products/PaginaCatalogoProductos.tsx), el modal de edición ahora refleja correctamente la foto actual del producto, permite cambiarla por una nueva (con cualquier formato/peso) o eliminarla con el botón "✕ Quitar foto".
4. **Evidencia Física en Inventarios**:
   - Actualizado [`InventoryListPage.tsx`](file:///d:/Proyecto_PDV-CDC/src/frontend/pos-web/src/pages/Inventory/InventoryListPage.tsx) para usar el mismo procesador con soporte HEIC y auto-compresión.
5. **Suite de Pruebas**:
   - Vitest: 27/27 pasadas (100%).
   - Build Vite: Exitoso con `heic2any` dividido en chunk independiente.

## Resumen de Cambios Previos en PR
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
