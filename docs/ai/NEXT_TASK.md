# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `mantenimiento/mejoras-catalogo-productos`
- **Funcionalidades Completadas**:
  1. **Identificador Secuencial `IdProducto` (Identity 1-1)**:
     - Añadido a `Producto` / `Product` y DTOs de Backend y Frontend.
     - Configurado como SQL Server `IDENTITY(1,1)` con índice único `IX_Products_IdProducto` manteniendo el GUID como PK.
     - Soporte para simulador `InMemory` en `PosDbContext.cs`.
     - Migración EF Core `20260909231411_AddIdProductoIdentityToProducts` generada.
     - Columna "ID" (`#{p.idProducto}`) visible en tabla de catálogo con ordenamiento.
  2. **Columna "Inventario Actual"**:
     - Columna añadida a la tabla mostrando piezas en inventario con badges de estado y ordenamiento.
  3. **Baja Lógica de Productos (ABC / CRUD Completo)**:
     - Endpoint `DELETE /api/v1/products/{id}` con autorización `Catalog.ProductsEdit`.
     - Desactivación con auditoría `PRODUCT_DELETED`.
     - Filtro `includeInactive` (Activos, Inactivos, Todos) en backend y UI.
     - Botón "🗑️ Eliminar" en frontend con diálogo de confirmación y advertencia.
- **Estado de Pruebas**:
  - Frontend: `npm run build` exitoso (código 0); 47/47 pruebas unitarias de Vitest superadas (100%).
  - Backend: 77/77 pruebas xUnit superadas al 100% (`dotnet test src/backend/Pos.sln`); `dotnet build` con 0 errores y 0 advertencias.

## 📌 Siguiente Tarea Recomendada

Revisión y fusión del Pull Request **[PR #4](https://github.com/UTLCDA/Proyecto_PDV-CDC/pull/4)** hacia `main`, seguido de la ejecución de la migración en el entorno de producción (`dotnet ef database update`).

### Criterios de Aceptación
1. Revisión y aprobación del Pull Request #4 en GitHub (`https://github.com/UTLCDA/Proyecto_PDV-CDC/pull/4`).
2. Fusión (Merge) a la rama `main` y despliegue a producción en Cloudflare Pages y VPS Cloud.
3. Ejecución de la migración `20260909231411_AddIdProductoIdentityToProducts` en SQL Server de producción.
3. Validación en pantalla de catálogo: visualización del `IdProducto` correlativo, conteo de piezas de inventario actual, y funcionamiento del botón de baja lógica.

