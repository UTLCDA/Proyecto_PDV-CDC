# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `main` (desplegada y sincronizada con `origin/main` en commit `3551058`).
- **Funcionalidad Desplegada a Producción**:
  1. **Almacenamiento Físico WebP en Disco**:
     - Desplegado en VPS Ubuntu 26.04 (`193.46.198.88`) bajo `/var/wpcbajio/data/products`.
     - Motor `LocalProductImageStorageService` con ImageSharp generando variantes atómicas (`thumbnail.webp`, `pos.webp`, `preview.webp`).
  2. **Entrega de Archivos Estáticos con Caché HTTP**:
     - `app.UseStaticFiles()` sirviendo imágenes bajo `/products` con `Cache-Control: public, max-age=604800, must-revalidate`.
  3. **Endpoints REST y Migración Base64**:
     - `POST /api/v1/products/{id}/image`, `DELETE /api/v1/products/{id}/image` y `POST /api/v1/products/migrate-base64-images` operativos.
     - Migración ejecutada con éxito en VPS.
  4. **Optimización de Memoria, Carga y Categorías en Punto de Venta y Catálogo**:
     - Catálogo aligerado, consulta inicial POS `pageSize: 40` con búsqueda en servidor (`GET /api/v1/products/code/{code}`).
     - Botón flotante `✕` para descarte y eliminación rápida de imágenes en el catálogo.
     - Categoría preconfigurada en PDV y Catálogo (`7938934b-d6cb-44fd-98de-b0645c66017d` - `Lambrin Interior 格栅板`), eliminando llamadas a `GET /categories` para evitar saturación de la API.
- **Estado del Servicio en Producción**:
  - `pos-api.service`: `active (running)` en VPS.
  - Health check: `https://api.wpcbajio.com/api/v1/health` ➔ HTTP 200 OK.
  - Catálogo API: `https://api.wpcbajio.com/api/v1/products` ➔ HTTP 200 OK.
  - Frontend SPA: Desplegado en Cloudflare (`https://pos.wpcbajio.com` / `https://pos-wpcbajio.aaronarenasmartinez.workers.dev`).
- **Estado de Pruebas**:
  - Backend: 84/84 pruebas xUnit superadas al 100%.
  - Frontend: 47/47 pruebas Vitest aprobadas al 100%.

## 📌 Siguiente Tarea Recomendada

Verificación funcional en caliente desde la interfaz web del Punto de Venta en producción (`https://pos.wpcbajio.com`), validando la subida de una nueva imagen de producto desde el catálogo, su almacenamiento físico en `/var/wpcbajio/data/products` y su visualización inmediata en las tarjetas del PDV.

### Criterios de Aceptación
1. Iniciar sesión en el Punto de Venta de producción con credenciales de usuario o administrador.
2. Cargar una imagen en un producto del catálogo (o crear un producto de prueba).
3. Confirmar que la imagen se almacene en `/var/wpcbajio/data/products/{id}/` y responda HTTP 200 desde `https://api.wpcbajio.com/products/{id}/pos.webp`.
4. Validar que la cuadrícula del Punto de Venta muestre la imagen sin ralentizaciones.
5. Eliminar la imagen mediante el botón flotante `✕` y confirmar que se borre físicamente del disco y de la base de datos.



