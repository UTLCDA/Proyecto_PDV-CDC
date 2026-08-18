# NEXT TASK — Módulo de Promociones y Ofertas

## Estado actual

- El rediseño de Bitácora y Auditoría Central del Sistema está completado y probado.
- La base de datos limpia `PosLambrinDb` fue generada con 26 tablas, 10 migraciones aplicadas y poblada exclusivamente con Roles, Permisos, Usuario `admin` y Cliente Público en General (sin datos demo de ventas/productos).
- El botón `📜 Bitácora del Sistema` del navbar fue removido y Serilog InMemory sink fue desactivado.
- Pruebas automatizadas: backend **67/67**, Vitest frontend **24/24**, build Release / Vite aprobados.

## Siguiente única tarea recomendada

Diseñar e implementar el **Módulo de Promociones y Ofertas** con cambios pequeños y auditables.

### Criterios de aceptación iniciales

1. Definir vigencia, prioridad y reglas de acumulación sin duplicar la lógica actual de descuentos.
2. Aplicar promociones de forma autoritativa en backend y mostrar el desglose en PDV, ticket e histórico.
3. Proteger alta/edición con permisos y registrar cambios en bitácora.
4. Conservar cálculos monetarios con `decimal`, `IdVenta` operativo y transacciones atómicas.
5. Agregar migración incremental, pruebas unitarias/integración y actualización documental.
