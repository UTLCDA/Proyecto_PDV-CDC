# NEXT TASK — Despliegue de Release PR "version-final-de-PR" y Fusión a Main

## Estado actual

- **Rama Git Activa**: `version-final-de-PR` (con HotFix de imágenes integrado).
- **Funcionalidades Verificadas**:
  - Corrección de carga de imágenes HEIC/HEIF y compresión Canvas (< 250 KB Base64) integrada al 100%.
  - Edición y reemplazo de fotos en productos existentes operativa sin bloqueo de 2 MB.
  - Punto de Venta (PDV), Calculadora de m², Cancelación de Ventas, Límite diario de cajas a clientes y exportaciones bilingües CJK verificadas.
  - Suite de pruebas: Backend xUnit 56/56 pasadas, Frontend Vitest 27/27 pasadas, compilación Release exitosa.

- **Estado de Producción (VPS `193.46.198.88`)**:
  - .NET 9 SDK instalado (`9.0.317 linux-x64`).
  - Backend compilado in situ en `/var/www/pos-api` desde rama `version-final-de-PR`.
  - Nginx configurado con `client_max_body_size 50M;` y servicio `pos-api` activo.
  - Endpoints de salud respondiendo 200 OK en `https://api.wpcbajio.com/api/v1/health`.

## Siguiente única tarea recomendada

Fusión del Pull Request de la rama `version-final-de-PR` hacia `main` / `fase-1.1` y despliegue a producción.

### Criterios de Aceptación
1. Revisión de código y aprobación final del PR por el desarrollador humano.
2. Fusión de `version-final-de-PR` en `main`.
3. Despliegue en IIS local / VPS Ubuntu con base de datos en producción.

