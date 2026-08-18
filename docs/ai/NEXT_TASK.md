# NEXT TASK — Módulo de Promociones y Ofertas

## Estado actual

- La exportación administrativa PDF/XLSX está implementada y aprobada en la rama `codex/exportacion-pdf-excel`, lista para integrarse a `fase-1.1`.
- La infraestructura es reutilizable, conserva permisos y filtros, recupera todas las páginas autorizadas y no modifica el esquema SQL.
- Los refinamientos visuales solicitados para Ventas, Transacciones, Clientes, contraseña de Usuarios y periodo de Movimientos de Inventario están incorporados y aprobados.
- Validación automatizada del corte: backend **67/67**, frontend **21/21**, builds Release/Vite aprobados.

## Siguiente única tarea recomendada

Diseñar e implementar el **Módulo de Promociones y Ofertas** con cambios pequeños y auditables.

### Criterios de aceptación iniciales

1. Definir vigencia, prioridad y reglas de acumulación sin duplicar la lógica actual de descuentos.
2. Aplicar promociones de forma autoritativa en backend y mostrar el desglose en PDV, ticket e histórico.
3. Proteger alta/edición con permisos y registrar cambios en bitácora.
4. Conservar cálculos monetarios con `decimal`, `IdVenta` operativo y transacciones atómicas.
5. Agregar migración incremental, pruebas unitarias/integración y actualización documental.
