# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `main`
- **Funcionalidades Completadas**:
  1. **Alertas Reactivas Dinámicas en Español y Chino**:
     - Alerta de turno no aperturado (`noOpenShiftBanner`) 100% reactiva a la selección de idioma (`t('noOpenShiftBanner')`), traduciéndose inmediatamente al conmutar entre Español y Chino.
     - Sistema de avisos `notice` en POS refactorizado para soportar claves de traducción dinámicas (`key`, `params`).
  2. **Estandarización Bilingüe Universal de Columnas (`Nombre Español / Nombre Chino`)**:
     - Estandarizado en el 100% de tablas de todos los módulos: Productos, Categorías, Clientes, Inventario, Movimientos, Cotizaciones, Ventas, Operaciones Comerciales (Abonos, Transacciones, Devoluciones), Turno de Caja, Usuarios y Bitácora de Auditoría.
  3. **Identificador Secuencial `IdProducto` (Identity 1-1)** y mejoras al Catálogo de Productos integradas a `main`.
- **Estado de Pruebas**:
  - Frontend: `npm run build` exitoso (código 0, 11s); 47/47 pruebas unitarias de Vitest superadas (100%).
  - Backend: 77/77 pruebas xUnit superadas al 100% (`dotnet test src/backend/Pos.sln`); `dotnet build` con 0 errores y 0 advertencias.

## 📌 Siguiente Tarea Recomendada

Subir los cambios de traducción y estandarización a `main` y desplegar a los entornos de producción (Cloudflare Pages para frontend y VPS Cloud para backend).

### Criterios de Aceptación
1. Confirmación de commit y push a `origin/main`.
2. Verificación de compilación automática y despliegue de frontend en Cloudflare Pages (`https://pos.wpcbajio.com`).
3. Verificación de que al conmutar entre Español y Chino en la aplicación web, todos los encabezados de tabla mantengan su estándar `Español / 中文` y las alertas reactivas se muestren en el idioma seleccionado.

