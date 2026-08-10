# NEXT TASK — Folio Operativo `IdVenta` en Rama `fase-1.1`

## Estado de la Rama `fase-1.1`

La implementación del **folio consecutivo operativo `IdVenta`** se ha realizado de forma totalmente aditiva, retrocompatible y segura en la rama `fase-1.1`.

### Resumen de la Implementación `IdVenta`

1. **Estructura y Relaciones**:
   - `Sales.IdVenta`: Columna `INT IDENTITY(1,1) NOT NULL` con índice `UNIQUE`.
   - Propagación a tablas secundarias: `SaleItems`, `PaymentInstallments`, `ReturnHeaders`, `InventoryMovements` y `CashTransactions` (`INT NULL` con índices de consulta).
   - Identificadores GUID `Id`, Primary Keys y Foreign Keys conservados al 100%.

2. **Criterios de Aceptación Cumplidos (DoD)**:
   - ✅ Pruebas xUnit Backend: **57/57** pasadas al 100%.
   - ✅ Pruebas Vitest Frontend: **8/8** pasadas al 100%.
   - ✅ Compilación Backend `.NET 9`: **0 advertencias / 0 errores**.
   - ✅ Compilación Frontend `Vite + React`: **Exitoso** sin errores.
   - ✅ Validaciones Cruzadas e Inconsistencia: **0 errores**.

---

### Siguiente Paso Recomendado

- **Validar y publicar la corrección de persistencia de ventas**:
  - Reiniciar el API Debug para cargar la corrección del doble guardado, la lectura transaccional del `IdVenta` y la conexión sin MARS.
  - Confirmar que el arranque y la venta ya no registran `SavepointsDisabledBecauseOfMARS` ni el falso error `SQL Server no generó el folio operativo IdVenta`.
  - Procesar una venta controlada y comprobar HTTP 201, una sola reducción de stock y propagación de `IdVenta` a partidas y movimientos.
  - Tras aprobación humana, crear el commit correspondiente en `fase-1.1`.
  - Después continuar con Promociones, Entregas/Envíos, Exportación PDF/XLSX o Fase 2.
