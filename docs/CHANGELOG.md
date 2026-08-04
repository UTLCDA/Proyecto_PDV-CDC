# CHANGELOG — WPC Bajío POS & Platform

All notable changes to this project will be documented in this file.

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
