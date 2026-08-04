# HANDOFF — v1.2.0 Control de Inventarios

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
