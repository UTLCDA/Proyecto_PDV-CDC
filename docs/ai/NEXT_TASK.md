# NEXT TASK — Fusión de PR "version-final-de-PR" y Despliegue Final

## Estado actual

- **Rama Git Activa**: `version-final-de-PR`.
- **Todos los requerimientos solicitados por el cliente fueron completados y verificados al 100%**:
  - PDV: Botones rápidos `Pieza +` / `Caja +`, Calculadora de m² de Lambrín en checkout, cobertura corregida por pieza, desglose visual de piezas/cajas/m² en carrito y buscador en tiempo real.
  - Catálogo: Campo `Costo Neto ($ MXN)` en modal de producto, persistencia full-stack de `CostoUnitario` e insignias/cabeceras bilingües.
  - Clientes: Permiso de Límite Diario de Cajas por cliente, validación autoritativa en ventas y consulta de Historial de Compras por cliente.
  - Reportería y Movimientos: Tablas y exportaciones con columnas de Costo Actual, Precio Venta, Monto Total, Impuesto, Costo Neto y Ganancia. Encabezados bilingües (Español / Chino Simplificado) al 100% en PDF y Excel.
  - Pruebas: Backend **67/67** pasadas, Vitest **24/24** pasadas, build de producción Vite exitoso.

## Siguiente única tarea recomendada

Realizar la revisión final y aprobación del Pull Request de la rama `version-final-de-PR` hacia `main` / `fase-1.1`.

### Criterios de Aceptación
1. Revisión de código y aprobación explícita por el desarrollador humano.
2. Ejecución del script de migración SQL Server en la base de producción.
3. Fusión de la rama `version-final-de-PR` hacia `main`.
