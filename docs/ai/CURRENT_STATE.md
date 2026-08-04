# CURRENT STATE — Estado Real del Sistema WPC Bajío

## Estado de la Aplicación
- **Versión actual**: `v1.2.0` — módulo **🏭 Control de Inventarios** completado.
- **Publicación Git**: historial consolidado en `main` y etiqueta anotada `v1.2.0`.
- **Backend (.NET 9)**: inventario expone imagen de producto, ubicación, cantidades anterior/nueva y evidencia física opcional por movimiento. La ubicación capturada se persiste y se incluye en auditoría; el Base64 de la evidencia nunca se copia a la bitácora.
- **Frontend (React 18 + TypeScript)**: modal responsivo y limpio, cantidad borrable, observación multilinea, campos sin datos precargados salvo la bodega temporal, miniaturas de producto, escáner USB con filtrado inmediato y movimientos traducidos con colores diferenciados.
- **Evidencia física**: una imagen opcional JPG/PNG/WEBP por movimiento, máximo 2 MB, con vista previa y miniatura en historial. Al pulsar la miniatura se abre un visor modal dentro del sistema, sin crear pestañas, con cierre por botón, fondo o tecla `Esc`.
- **Ubicación temporal**: `Bodega Adolfo Lopez Mateos`. La centralización/multialmacén sigue pendiente para una fase futura.

## Base de Datos
- **Motor**: SQL Server `AAM`, base `PosLambrinDb`.
- **Migración aplicada**: `20260804135557_AddInventoryMovementEvidenceImage`.
- **Columna verificada**: `InventoryMovements.EvidenceImageUrl` (`nvarchar(max)`, no nula).
- Se agregó una factoría de diseño para generar migraciones sin ejecutar el arranque destructivo de la API.

## Cobertura y Validaciones Ejecutadas
- **Backend xUnit**: **27/27 aprobadas** (`12` dominio, `7` aplicación, `8` integración API).
- **Frontend Vitest**: **2/2 aprobadas**.
- **Frontend producción**: `tsc && vite build`, sin errores.
- **Backend Debug**: compilación sin advertencias ni errores. La instancia temporal de QA se detuvo al terminar para dejar libre `http://localhost:5000`.
- **Validación visual**: sin errores de consola; Salida roja, Ajuste cian, Venta amarilla, historial antes/después, escaneo inmediato, vista previa y visor modal de evidencia confirmados. El número de pestañas permaneció sin cambios al abrir la evidencia y el cierre por `×`/`Esc` fue verificado.

## Versiones Git
- **Tag actual**: `v1.2.0`.
- Las mejoras de Inventario forman parte de la versión `v1.2.0`.
