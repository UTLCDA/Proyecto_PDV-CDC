# NEXT TASK — Inicio de Fase 2 (Plataforma E-Commerce / Atributos Avanzados)

## Estado actual

- **Fase 1 100% Concluida y Fucionada a `main`**:
  - La rama `main` contiene la base autoritativa de la Fase 1 con todas las funcionalidades de PDV, Ventas, Cotizaciones, Inventario, Caja, Clientes, Usuarios, Permisos, Auditoría Central y Exportación PDF/Excel.
  - La rama `fase-1.1` queda archivada y concluida; de ahora en adelante se utilizarán ramas consecutivas para la Fase 2 (ej. `fase-2.0` / `feature/...`).
  - La base de datos limpia `PosLambrinDb` está lista para producción.
  - Pruebas automatizadas: backend **67/67**, Vitest frontend **24/24**, build Release / Vite aprobados.

## Siguiente única tarea recomendada

Diseñar e implementar el **Módulo de Promociones y Ofertas** con cambios pequeños y auditables.

### Criterios de aceptación iniciales

1. Definir vigencia, prioridad y reglas de acumulación sin duplicar la lógica actual de descuentos.
2. Aplicar promociones de forma autoritativa en backend y mostrar el desglose en PDV, ticket e histórico.
3. Proteger alta/edición con permisos y registrar cambios en bitácora.
4. Conservar cálculos monetarios con `decimal`, `IdVenta` operativo y transacciones atómicas.
5. Agregar migración incremental, pruebas unitarias/integración y actualización documental.
