# Exportación administrativa PDF y Excel

## Convención

- PDF: reporte administrativo A4 generado con `@react-pdf/renderer`; usa el logotipo oficial `public/logo_wpc_bajio.jpeg`, encabezado, filtros aplicados, tabla paginable, encabezados repetidos y pie `Página X de Y`.
- Excel: libro `.xlsx` generado con `ExcelJS`; conserva fechas y números como valores tipados, aplica moneda/porcentaje, autofiltro, encabezado congelado, ajuste de columnas, wrapping, bordes y filas alternadas.
- Identidad: `components/export/exportTheme.ts` concentra la paleta de archivos y `index.css` concentra los tokens de botones PDF/Excel.
- Fechas: `utils/operationalDate.ts` calcula el día operativo con `America/Mexico_City` y convierte límites locales a UTC.
- Folios: los reportes comerciales exportan `IdVenta` y referencias `RECIBO-{IdVenta}`; no incluyen GUID técnicos.

## Componentes reutilizables

- `components/export/ExportButtons.tsx`: botones, disabled sin datos, estado `Generando...`, manejo de error y carga opcional del conjunto completo.
- `components/export/PdfReport.tsx`: construcción y descarga del PDF.
- `components/export/excelExporter.ts`: construcción y descarga de XLSX.
- `components/export/exportTypes.ts`: contrato tipado de reporte, columnas, filtros, orientación y rango.
- `components/export/formatters.ts`: nombres de archivo, formatos y carga del logo.
- `utils/pagedExport.ts`: recuperación por páginas de 500 registros y límites seguros de 10,000 filas para PDF y 50,000 para Excel.

Cada módulo sólo declara título, archivo, hoja, orientación, filtros y columnas funcionales. Acciones, botones, imágenes Base64, claims, tokens, GUID y campos técnicos quedan excluidos.

## Clasificación de módulos

### A. PDF + Excel

- Catálogo de productos.
- Inventario y existencias.
- Directorio de clientes.
- Cotizaciones.
- Devoluciones.
- Movimientos del turno, movimientos generales e histórico de caja.
- Resumen de ventas, productos más vendidos, resumen de inventario y stock bajo.
- Usuarios y roles (sin códigos de permiso ni datos de seguridad).

### B. PDF + Excel + periodo

- Histórico de ventas.
- Movimientos de inventario.
- Histórico de abonos.
- Histórico de transacciones y movimientos de pago.
- Reportes ejecutivos de ventas.
- Auditoría funcional.

Las fechas comienzan con el día actual de México. Los inputs aplican `min`/`max`, el backend vuelve a validar el rango y los archivos usan los últimos filtros realmente consultados, no valores aún sin aplicar.

### C. Sin exportación deliberada

- Login.
- Punto de Venta y carrito activo: flujo transaccional, no listado administrativo.
- Formularios de alta/edición y modales de detalle.
- Plantillas de contratos y comprobantes: ya tienen flujo de impresión propio y no son catálogos tabulares.

## Datos completos y rendimiento

Los endpoints de ventas, clientes, movimientos, cotizaciones, pagos, devoluciones, caja y auditoría aceptan opcionalmente `page` y `pageSize`. Los contratos anteriores continúan funcionando con sus valores predeterminados.

Al exportar, `loadAllPagesForExport` solicita lotes sucesivos manteniendo filtros y permisos. La operación termina cuando una página contiene menos de 500 filas. Si supera el límite seguro, se cancela con un mensaje para reducir el periodo/filtros; nunca se entrega silenciosamente sólo la página visible.

Los módulos cuyos endpoints ya devuelven el catálogo completo (productos, stocks, usuarios y roles) reutilizan directamente su resultado autorizado. Los reportes agregados y el ranking Top 10 exportan exactamente el conjunto definido por la consulta visible.

## Dependencias

- `@react-pdf/renderer` 4.6.1.
- `exceljs` 4.4.0.
- Override `uuid` 11.1.1 para corregir la advertencia de seguridad transitiva de ExcelJS. La generación real de XLSX está cubierta por prueba automatizada.

No se agregó librería de iconos: el proyecto utiliza los iconos Unicode existentes.

## Validación automatizada

- Vitest valida zona horaria, nombres de archivos, formatos, recuperación de 1,253 filas en tres páginas, límite seguro, parámetros de paginación, un XLSX real reabierto con ExcelJS y un PDF válido de 75 filas.
- xUnit valida paginación estable y sin solapamientos en ventas, además de toda la regresión existente.
- No hubo cambios de esquema SQL ni migraciones.

## Mapa de archivos

- Infraestructura frontend: `src/components/export/*`, `src/utils/operationalDate.ts`, `src/utils/pagedExport.ts`, `src/index.css`, `src/i18n/index.ts`, `vite.config.ts`, `package.json` y `package-lock.json`.
- Pantallas: `SalesHistoryPage.tsx`, `CustomerListPage.tsx`, `PaginaCatalogoProductos.tsx`, `InventoryListPage.tsx`, `InventoryMovementsPage.tsx`, `QuoteListPage.tsx`, `CommercialOpsPage.tsx`, `CashShiftPage.tsx`, `ReportsDashboardPage.tsx`, `AuditLogPage.tsx` y `PaginaUsuarios.tsx`, junto con sus CSS cuando fue necesario acomodar acciones responsive.
- Clientes API frontend: `servicioVentas.ts`, `servicioCatalogo.ts`, `inventoryService.ts`, `commercialService.ts`, `cashShiftService.ts` y `reportsService.ts`.
- Backend: controladores `Sales`, `Customers`, `Inventory`, `Quotes`, `Payments`, `Returns`, `CashShift` y `Audit`; sus interfaces/servicios Application e Infrastructure; helper `QueryPaging.cs`.
- Pruebas: `exportInfrastructure.test.ts` y paginación estable en `SaleApplicationTests.cs`.
- Documentación: `CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_TASK.md`, `CHANGELOG.md`, este documento y `PR_EXPORTACION_PDF_EXCEL.md`.
