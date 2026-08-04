# v1.2.0: Mejoras de Control de Inventarios y Evidencia Física

## Resumen
Mejora el flujo de captura y consulta de inventario con un modal seguro, escaneo rápido, trazabilidad antes/después, imágenes de producto y evidencia física asociada a cada movimiento.

## Cambios principales
- Corrige desbordamiento del selector de productos y hace responsivo el modal.
- Permite vaciar la cantidad y reinicia los campos operativos al abrir.
- Convierte el motivo en área multilinea y persiste la ubicación de almacén.
- Agrega imágenes de producto a existencias y colores exclusivos por tipo de movimiento.
- Muestra cantidad anterior y nueva en el historial.
- Integra lector USB para filtrar por código de barras sin demora por estado React.
- Agrega `EvidenceImageUrl` a dominio, DTOs y API, con límite de 2 MB y vista previa.
- Abre la miniatura de evidencia en un visor modal responsivo, sin pestañas nuevas, con cierre por botón, fondo y `Esc`.
- Introduce y aplica la migración EF Core incremental de evidencia física.
- Sustituye la recreación destructiva de esquema por fallo seguro con conservación de datos.

## Pruebas
- `dotnet test src/backend/Pos.slnx -c Release --nologo`: 27/27 aprobadas.
- `npm --prefix src/frontend/pos-web run test`: 2/2 aprobadas.
- `npm --prefix src/frontend/pos-web run build`: exitoso.
- Compilación `Debug` de API: 0 advertencias, 0 errores.
- QA visual local: badges, historial, escaneo, modal de captura, vista previa y visor de evidencia verificados sin errores de consola; abrir la evidencia no cambió el número de pestañas.

## Base de datos
- Migración: `20260804135557_AddInventoryMovementEvidenceImage`.
- Aplicada y verificada en SQL Server `AAM` / `PosLambrinDb`.
- No se eliminaron ni recrearon datos existentes.

## Validación manual solicitada
Ejecutar los criterios definidos en `docs/ai/NEXT_TASK.md`, especialmente el registro real de un movimiento con evidencia y la revisión de bitácora.
