# NEXT TASK — Folio Operativo `IdVenta` en Rama `fase-1.1`

## Estado de la Rama `fase-1.1`

La implementación del **folio consecutivo operativo `IdVenta`** se ha realizado de forma totalmente aditiva, retrocompatible y segura en la rama `fase-1.1`.

### Resumen de la Implementación `IdVenta`

1. **Estructura y Relaciones**:
   - `Sales.IdVenta`: Columna `INT IDENTITY(1,1) NOT NULL` con índice `UNIQUE`.
   - Propagación a tablas secundarias: `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements` y `CashTransactions` (`INT NULL` con índices de consulta).
   - Identificadores GUID `Id`, Primary Keys y Foreign Keys conservados al 100%.

2. **Criterios de Aceptación Cumplidos (DoD)**:
   - ✅ Pruebas xUnit Backend: **56/56** pasadas al 100%.
   - ✅ Pruebas Vitest Frontend: **8/8** pasadas al 100%.
   - ✅ Compilación Backend `.NET 9`: **0 advertencias / 0 errores**.
   - ✅ Compilación Frontend `Vite + React`: **Exitoso** sin errores.
   - ✅ Validaciones Cruzadas e Inconsistencia: **0 errores**.

---

### Siguiente Paso Recomendado

- **Revisión y Merge a `main` o Continuación de Mejoras en `fase-1.1`**:
  - Fusionar la rama `fase-1.1` en `main` cuando el usuario lo determine.
  - Proceder con las siguientes mejoras diferidas (Promociones, Entregas/Envíos, Exportación a PDF/XLSX) o pasar a la Fase 2 (E-commerce).
