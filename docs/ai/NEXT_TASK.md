# NEXT TASK — Inicio de Fase 2 (Plataforma E-Commerce / Atributos Avanzados)

## Estado actual

- **Fase 1 & Ajustes Finales (v2.1.2) Concluidos**:
  - La rama `codex/2.1.1-comentarios-finales-clientes` contiene todos los ajustes finales comerciales, i18n, rediseño de facturación en PDV, soporte de 0%/16% IVA en backend/frontend, cálculo de cobertura por caja (`4.87 m²`), autocálculo de dimensiones en catálogo y plantillas de contrato.
  - La base de datos limpia `PosLambrinDb` está lista para producción.
  - Pruebas automatizadas: backend **67/67**, Vitest frontend **24/24**, build Release / Vite aprobados.

## Siguiente única tarea recomendada

Diseñar e implementar el **Módulo de Promociones y Ofertas** o despliegue a producción en SQL Server.

### Criterios de aceptación iniciales

1. Definir vigencia, prioridad y reglas de acumulación sin duplicar la lógica actual de descuentos.
2. Aplicar promociones de forma autoritativa en backend y mostrar el desglose en PDV, ticket e histórico.
3. Proteger alta/edición con permisos y registrar cambios en bitácora.
4. Conservar cálculos monetarios con `decimal`, `IdVenta` operativo y transacciones atómicas.
5. Agregar migración incremental, pruebas unitarias/integración y actualización documental.
