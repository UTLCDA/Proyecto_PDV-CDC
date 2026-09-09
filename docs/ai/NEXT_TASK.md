# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `mantenimiento/mejoras-v2`
- **Funcionalidades Completadas**:
  1. **HotFix de Rendimiento en Módulo de Ventas**: Corrección de explosión cartesiana y timeout de 15s al filtrar por fechas. Conteo en consulta base y paginación en dos fases con `.AsSplitQuery()` (reducción de tiempo de base de datos de 25,007 ms a ~41 ms). Desacoplamiento de `loadSales` en el frontend para evitar peticiones redundantes.
  2. **Paginación Server-Side Universal en los 11 módulos con tablas/listados del PDV WPC Bajío**: Paginación server-side (25, 50, 100) en todos los módulos con tablas.
  3. **Extensión Universal de la Arquitectura de Alto Rendimiento y Desacoplamiento de Filtros**:
     - Backend: Conteo puro sin colecciones dependientes en `CountAsync()`, paginación en 2 fases seleccionando IDs (`Skip().Take().Select(x => x.Id)`), y consulta dividida `.AsSplitQuery()` en Cotizaciones, Operaciones Comerciales, Catálogo de Productos, Categorías, Clientes, Control de Inventarios, Movimientos de Inventario, Turnos/Caja, Usuarios y Bitácora de Auditoría.
     - Frontend: Desacoplamiento de carga respecto a los campos de texto/fechas (usando `appliedFilters`), caching de listas desplegables/opciones estáticas, eliminación de filtrado truncador en cliente y botón homogéneo "Limpiar filtros".
  4. **Implementación de Componente de Paginación Numerada Reutilizable (`TablePagination`)**:
     - Despliegue homogéneo en las tablas de los 11 módulos (incluyendo vistas independientes de transacciones, abonos y devoluciones en Operaciones Comerciales).
     - Paginador con números inteligentes y elipses (`getPageNumbers`), resumen bilingüe, selector de tamaño 25/50/100, y diseño armonizado con los tokens de WPC Bajío.
- **Rama Git**: `main` (commit `69c9e7b`, sincronizado con `origin/main` y `mantenimiento/mejoras-v2`).
- **Despliegue de Producción**:
  - **VPS Cloud (`193.46.198.88`)**: Compilado y publicado a `/var/www/pos-api/`, `pos-api.service` activo y respondiendo 200 OK.
  - **Cloudflare Pages**: Sincronizado con `main` para despliegue global en `https://pos.wpcbajio.com`.
- **Estado de Pruebas**:
  - Frontend: Build de producción `npm run build` (`tsc && vite build`) completado con éxito (código de salida 0); 47/47 pruebas unitarias de Vitest superadas (100%).
  - Backend: 73/73 pruebas superadas al 100% (xUnit); `dotnet build` con 0 errores y 0 advertencias.

## 📌 Siguiente Tarea Recomendada

Monitoreo y validación de usuario final en el entorno de producción (`https://pos.wpcbajio.com`).

### Criterios de Aceptación
1. Confirmar visualización de la barra de paginación numerada en todas las pantallas operativas desde el dominio de producción (`https://pos.wpcbajio.com`).
2. Validar navegación ágil de páginas y selector de tamaño (25, 50, 100) en Ventas, Productos, Inventarios, Clientes y Turnos de Caja.
3. Verificar que las exportaciones a PDF y Excel continúen descargando la totalidad de los datos paginados sin bloqueos.
