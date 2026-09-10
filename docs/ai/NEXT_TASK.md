# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `main` (commit `33eee52`, sincronizado con `origin/main` tras fusión de PR #4)
- **Funcionalidades Completadas e Integradas a Main**:
  1. **Identificador Secuencial `IdProducto` (Identity 1-1)**:
     - Añadido a `Producto` / `Product` y DTOs de Backend y Frontend.
     - Configurado como SQL Server `IDENTITY(1,1)` con índice único `IX_Products_IdProducto` manteniendo el GUID como PK.
     - Soporte para simulador `InMemory` en `PosDbContext.cs`.
     - Migración EF Core idempotente: `20260909231411_AddIdProductoIdentityToProducts`.
     - Columna `#ID` visible en primera posición de la tabla con ordenamiento.
  2. **Columna "Inventario Actual"**:
     - Columna en tabla mostrando piezas en inventario con badges de estado y ordenamiento interactivo (sin duplicación).
  3. **Baja Lógica de Productos (ABC / CRUD Completo)**:
     - Endpoint `DELETE /api/v1/products/{id}` con autorización `Catalog.ProductsEdit`.
     - Desactivación con auditoría `PRODUCT_DELETED`.
     - Filtro `includeInactive` (Activos, Inactivos, Todos) en backend y UI.
     - Botón "🗑️" en frontend con diálogo de confirmación y advertencia.
  4. **Refinamiento de UI y Formato Bilingüe Universal**:
     - Orden de columnas: 1° ID, 2° Imagen, 3° SKU/Código.
     - SKU grande (`1.15rem`, negrita 800) y código debajo.
     - Botones de acciones compactos de iconos (32x32px: `📄`, `✏️`, `🗑️`).
     - Formato dual `Español / 中文` en el 100% de los encabezados de tabla.
- **Estado de Pruebas**:
  - Frontend: `npm run build` exitoso (código 0); 47/47 pruebas unitarias de Vitest superadas (100%).
  - Backend: 77/77 pruebas xUnit superadas al 100% (`dotnet test src/backend/Pos.sln`); `dotnet build` con 0 errores y 0 advertencias.

## 📌 Siguiente Tarea Recomendada

Despliegue y publicación a los entornos de producción (VPS Cloud para backend y Cloudflare Pages para frontend), seguido de la aplicación de la migración en la base de datos SQL Server de producción.

### Criterios de Aceptación
1. Despliegue de backend en VPS Cloud (`193.46.198.88`) y ejecución de `dotnet ef database update` para aplicar `20260909231411_AddIdProductoIdentityToProducts`.
2. Verificación de compilación automática y despliegue de frontend en Cloudflare Pages (`https://pos.wpcbajio.com`).
3. Validación en pantalla de producción: visualización del `#ID`, SKU destacado, inventario numérico y funcionamiento de la baja lógica.

