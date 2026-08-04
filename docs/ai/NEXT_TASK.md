# NEXT TASK — Única Tarea Recomendada

## Tarea: Validación del Módulo de Productos v1.1 y Siguiente Módulo de Mejoras

### Objetivo
Realizar la validación por parte del desarrollador humano de los 11 puntos de mejora implementados en el **Catálogo de Productos WPC Bajío** (Formulario modal limpio de 2 columnas, vista previa e input de imágenes, prefijo obligacional `WPC-`, cálculo automático de $m^2$ por caja, unidades de medida ampliadas y columna de miniaturas en tabla).

### Criterios de Aceptación
1. Abrir **📦 Catálogo** y verificar la nueva columna de miniatura de imagen.
2. Hacer clic en **➕ Nuevo Producto Lambrín** y validar:
   - Prefijo SKU inamovible `WPC-`.
   - Caja de texto **Descripción** visible.
   - Input de imagen con vista previa local.
   - Cálculo automático de $m^2$ totales por caja (`PiezasPorCaja` x `CoberturaUnitarioM2`).
   - Cajas de dinero sin ceros molestos a la izquierda (ej. `150` en lugar de `0150`).
3. Confirmar la inserción automática en **🏭 Inventario** al guardar un producto.
