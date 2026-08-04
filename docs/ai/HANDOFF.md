# HANDOFF — Resumen de Versión v1.0.0 Tagged y Mejoras a Catálogo v1.1

## Resumen de la Sesión
1. **Publicación y Tag v1.0.0 en Git**:
   - Inicializado el repositorio Git en la raíz del proyecto.
   - Realizado commit y tag `v1.0.0` etiquetando formalmente el Release Candidate 1 del sistema WPC Bajío.

2. **Refactorización Completa del Módulo de Productos (Puntos 1.0 - 2.1)**:
   - **Base de Datos & Backend**: Nuevas propiedades en `Producto.cs`, `CatalogDtos.cs`, `CatalogApplicationService.cs` y `DbInitializer.cs` (`ImagenUrl`, `PiezasPorCaja`, `CoberturaM2Caja`, `LargoCm`, `AltoCm`, `AnchoCm`, `CantidadInventarioInicial`).
   - **Stock Automático**: Al dar de alta un producto, se inserta automáticamente el registro correspondiente en la tabla de existencias (`Stocks`).
   - **Formulario Modal Rediseñado en 2 Columnas**: Organizado en secciones (*Información General*, *Dimensiones y Cobertura*, *Precios e Inventario*).
   - **Imágenes**: Input de carga de imagen local con vista previa interactiva en tiempo real.
   - **SKU Estandarizado**: Prefijo obligatorio e inamovible `"WPC-"`.
   - **Formateo de Cajas Monetarias**: Eliminación del comportamiento de ceros a la izquierda.
   - **Unidades de Medida**: Selector ampliado con `Pza`, `M2`, `ML`, `Caja`, `Kilo`, `Bolsa`, `Tubo`, `Juego`.
   - **Tabla con Miniaturas (Thumbnails)**: Columna de imagen de 50x50px con recuadro limpio placeholder si no cuenta con foto.
   - **Carrito PDV**: Visualización de miniaturas de producto y cobertura de muros en el punto de venta.

## Pruebas
- **Backend (.NET xUnit)**: 26/26 Pasadas al 100%.
- **Frontend (Vite Build)**: Éxito en 1.52s sin errores.
