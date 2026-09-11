# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `feature/optimizacion-storage-imagenes-productos`
- **Funcionalidad Completada**:
  1. **Almacenamiento Físico WebP en Disco**:
     - Motor `LocalProductImageStorageService` con ImageSharp (4.1.1) generando variantes atómicas (`thumbnail.webp`, `pos.webp`, `preview.webp`).
     - Almacenamiento organizado por producto fuera de `wwwroot` con protección anti path-traversal.
  2. **Entrega de Archivos Estáticos con Caché HTTP**:
     - `app.UseStaticFiles()` con `PhysicalFileProvider` y `Cache-Control: public, max-age=604800, must-revalidate`.
  3. **Endpoints REST y Migración Base64**:
     - `POST /api/v1/products/{id}/image` (Multipart/form-data), `DELETE /api/v1/products/{id}/image`, y `POST /api/v1/products/migrate-base64-images`.
     - Compatibilidad total hacia atrás con imágenes `data:image/...`.
  4. **Optimización de Memoria y Carga en Punto de Venta**:
     - Retirado `.Include(p => p.Imagenes)` de `GetProductsAsync`, aligerando drásticamente el catálogo.
     - Carga inicial POS reducida a `pageSize: 40` con búsqueda en servidor (`GET /api/v1/products/code/{code}`) para escáneres USB.
     - `loading="lazy"` y `decoding="async"` en todas las etiquetas `<img>`.
- **Estado de Pruebas**:
  - Backend: 84/84 pruebas xUnit superadas al 100% (`dotnet test src/backend/Pos.sln`); `dotnet build` con 0 errores y 0 advertencias.
  - Frontend: 47/47 pruebas Vitest aprobadas al 100% (`npm run test`); `npm run build` exitoso (10.70s, 0 errores).

## 📌 Siguiente Tarea Recomendada

Revisión del Pull Request de la rama `feature/optimizacion-storage-imagenes-productos`, aprobación por el desarrollador humano, fusión a `main`, y ejecución del despliegue en VPS (preparación del directorio `/var/wpcbajio/data/products` y ejecución opcional de migración de imágenes legadas).

### Criterios de Aceptación
1. Revisión y aprobación del Pull Request de `feature/optimizacion-storage-imagenes-productos` a `main`.
2. Fusión limpia en `main` sin conflictos.
3. Creación del directorio de almacenamiento en el VPS y configuración del volumen o ruta de `Storage:ProductImagesPath`.
4. Ejecución del endpoint de migración `POST /api/v1/products/migrate-base64-images` para convertir cualquier imagen Base64 existente a WebP.
5. Verificación en producción de que las imágenes se carguen con respuesta HTTP 200/304 desde `/products/{id}/pos.webp` y el escáner USB funcione de inmediato.


