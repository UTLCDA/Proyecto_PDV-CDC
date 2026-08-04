# CURRENT STATE — Estado Real del Sistema WPC Bajío

## Estado de la Aplicación
- **Versión Actual**: `v1.1.0-catalog-refactor` (Release `v1.0.0` Etiquetada y Commiteada en Git; Fase 1.1 de Productos Completa).
- **Backend (.NET 9 C#)**: Operativo con arquitectura limpia modular, 24 permisos en español, Serilog dual (BD + `logs/auditoria-.log` + Dashboard UI `/serilog-ui` con login Basic Auth `administrador`/`Aaron096`), extensión de tokens JWT a 24 horas y nuevos campos de `Producto` (`ImagenUrl`, `PiezasPorCaja`, `CoberturaM2Caja`, `LargoCm`, `AltoCm`, `AnchoCm`, `CantidadInventarioInicial`).
- **Frontend (React 18 + Vite + TypeScript)**: Modal de productos rediseñado en 2 columnas, vista previa de imagen, prefijo inamovible `WPC-` en SKU, escaneo directo con lector de barras USB, unidades de medida ampliadas (`Pza`, `M2`, `ML`, `Caja`, `Kilo`, `Bolsa`, `Tubo`, `Juego`), formateo numérico sin ceros a la izquierda, tabla con miniatura de imágenes (50x50px) y actualización del carrito PDV.
- **Base de Datos**: SQL Server `AAM` (`PosLambrinDb`) con migración automática y siembra de existencias iniciales en `Stocks`.

## Cobertura de Pruebas
- **Pruebas Backend (.NET xUnit)**: **26/26 Pruebas Pasadas (100% Exito)**.
- **Compilación de Producción**: **Éxito en 1.52s sin errores**.

## Versiones Git
- **Tag en Git**: `v1.0.0` (Release Candidate de Fase 1).
