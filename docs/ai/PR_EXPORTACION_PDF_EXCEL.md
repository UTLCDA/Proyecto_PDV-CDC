# PR: Exportación administrativa PDF/Excel reutilizable

## Resumen

Se incorpora un estándar único de exportación PDF y Excel en los módulos administrativos del PDV WPC Bajío. Los reportes conservan filtros aplicados, zona horaria `America/Mexico_City`, `IdVenta` operativo, permisos existentes y recuperación paginada del conjunto completo.

## Cambios principales

- Componente reutilizable `ExportButtons` y configuración tipada por módulo.
- PDF A4 profesional con logo oficial, filtros, tabla multipágina y numeración.
- XLSX tipado con formatos, autofiltro, freeze, anchos y estilos WPC Bajío.
- Botones consistentes rojo PDF y verde Excel, con loading, disabled y responsive.
- Paginación API retrocompatible (`page`, `pageSize`) y carga frontend por lotes.
- Fechas del día operativo de México y validación de rangos.
- Exportaciones sin GUID, acciones de UI ni datos sensibles.

## Compatibilidad

- Sin cambios de esquema o migraciones SQL.
- Sin cambios de PK/FK ni de generación de `IdVenta`.
- Endpoints existentes conservan rutas y parámetros anteriores; la paginación es opcional.
- Los mismos permisos que protegen cada consulta protegen también sus datos exportables.

## Pruebas

- `dotnet build src/backend/Pos.slnx --configuration Release`
- `dotnet test src/backend/Pos.slnx --configuration Release`
- `npm --prefix src/frontend/pos-web run test`
- `npm --prefix src/frontend/pos-web run build`
- `npm --prefix src/frontend/pos-web audit --omit=dev`

Resultado final del 2026-08-17:

- Build backend: **0 errores / 0 advertencias**.
- xUnit: **67/67** (Domain 19, Application 36, Integration 12).
- Vitest: **21/21**, incluyendo generación y lectura real de XLSX/PDF y validación dinámica de contraseñas.
- Build Vite: **260 módulos**, correcto.
- Dependencias de producción: **0 vulnerabilidades**.
- La auditoría completa conserva 5 avisos exclusivos de desarrollo en la cadena heredada Vite 5/esbuild/Vitest; la corrección automática exige actualizar a Vite 6 con breaking change y queda fuera de esta entrega funcional.

## Aprobación humana

- Descargar una muestra PDF y XLSX en ventas, inventario y transacciones.
- Revisar legibilidad del PDF en portrait/landscape.
- Confirmar nombres de archivo y filtros impresos.
- Validar distribución de botones en desktop, laptop y tablet.
- Confirmar el nuevo orden del Histórico de Ventas, toolbar de Clientes y checklist de contraseña dentro del modal de Usuarios.
- Confirmar la claridad del bloque de periodo en Movimientos de Inventario tanto en escritorio como en móvil.

Los refinamientos funcionales y visuales fueron aprobados por el desarrollador responsable antes de autorizar la publicación de la rama.
