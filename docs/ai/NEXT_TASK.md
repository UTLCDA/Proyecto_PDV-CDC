# NEXT TASK — Única Tarea Recomendada

## Tarea: Validación del Sistema WPC Bajío 100% Completo y Preparación para el Despliegue de Fase 2

### Objetivo
Realizar la validación por parte del desarrollador humano y cliente de la versión de la Fase 1 con **todos los modales ABC (Altas, Bajas, Cambios)** operables en el frontend, la integración de **Serilog a archivos rotativos de log** y la ausencia de errores HTTP 400.

### Criterios de Aceptación
1. Probar los modales ABC en cada una de las 9 pestañas del sistema (`Usuarios`, `Clientes`, `Categorías/Productos`, `Inventario`, `Operaciones Comerciales/Abonos/Devoluciones`, `PDV`, `Caja`, `Reportes`).
2. Verificar que al realizar operaciones en el sistema se generen archivos de log rotativos diarios en la carpeta `logs/auditoria-YYYYMMDD.log`.
3. Proceder a la Fase 2 (E-Commerce WPC Bajío, comprobante PDF de Abono con Código de Barras y Pasarelas de Pago Web).

### Comandos de Validación
- `dotnet test src/backend/Pos.slnx`
- `npm --prefix src/frontend/pos-web run test`
- `npm --prefix src/frontend/pos-web run build`
