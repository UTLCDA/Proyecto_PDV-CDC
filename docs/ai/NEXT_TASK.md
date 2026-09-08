# NEXT TASK — Validación y Fusión del HotFix de Imágenes a PR

## Estado actual

- **Rama Git Activa**: `hf/error-subida-imagen-pr` (desprendida de `version-final-de-PR`).
- **Problema Corregido**:
  - Soporte completo para formato de imágenes HEIC/HEIF de iPhone con decodificación dinámica.
  - Supresión del límite estricto de 2 MB mediante auto-compresión y redimensionamiento Canvas a JPEG ligero (~100-250 KB).
  - Edición, reemplazo y eliminación de imagen en productos existentes habilitada de forma transparente en el modal de catálogo.
  - Optimización aplicada igualmente a evidencias fotográficas en el módulo de Inventarios.
  - Pruebas 100% verdes (Vitest 27/27, xUnit 56/56, build Vite exitoso con 0 errores).

## Siguiente única tarea recomendada

Validar el funcionamiento del modal de producto con una foto HEIC o de alta resolución en la rama `hf/error-subida-imagen-pr` y fusionar mediante Pull Request hacia la rama oficial `version-final-de-PR`.

### Criterios de Aceptación
1. Verificar subida de una imagen `.heic` o imagen > 2 MB en el modal de creación y edición de productos.
2. Confirmar que al editar un producto se puede cambiar la foto o eliminarla con "✕ Quitar foto".
3. Fusionar la rama `hf/error-subida-imagen-pr` en `version-final-de-PR`.

