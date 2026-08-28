# HANDOFF — Resumen de Transferencia y Estado de Entrega (v2.2.1 HotFix)

## 📌 Feature 2.4.0 — Conversión SKU a Guiones, Campo Color y Ficha Técnica PDF
- **Estandarización de SKU (Espacios a Guiones `-`)**: Al ingresar espacios en el input del SKU (`PaginaCatalogoProductos.tsx`), se convierten automáticamente en guiones `-` para mantener consistencia.
- **Campo de Color y Persistencia BD**: Añadido campo **Color / Tono** en formulario modal de productos, C# Domain (`Product.cs`, `Producto.cs`), DTOs y columna `Color` en SQL Server `PosLambrinDb`.
- **Descarga de Ficha Técnica PDF (`technicalSheetGenerator.tsx`)**: Nueva acción en tabla de catálogo **`📄 Ficha Técnica`**. Genera un PDF membretado con datos del producto, SKU, Color, código de barras, especificaciones de cobertura m² (pieza/caja), precios (menudeo, mayoreo, caja completa) y la regla comercial explicada para el cliente.

## 📌 Feature 2.3.0 — SKU Libre Captura y Código de Barras Dinámico en Base64
- **SKU de Libre Captura**: Se modificó la etiqueta a `SKU *` y se removió el autocompletado/restrcción del prefijo `WPC-` en el formulario modal de productos (`PaginaCatalogoProductos.tsx`).
- **Generador de Código de Barras Code 128 (`barcodeGenerator.ts`)**: Se creó una utilidad en Canvas que toma cualquier código de barras ingresado o escaneado y genera la imagen del código de barras en tiempo real.
- **Espacio de Previsualización y Almacenamiento Base64**: Se incorporó un contenedor dentro del modal de producto que renderiza visualmente la imagen del código de barras, guarda el string Base64 (`data:image/png;base64,...`) localmente e incluye la opción de descarga en PNG para impresión de etiquetas.

## 📌 HotFix 2.2.3 — Restricción de Módulo de Transacciones a Cajero
- **Control de Acceso al Histórico de Transacciones**: Se corrigió el permiso asignado a la pestaña `💳 Transacciones` ("Histórico de Transacciones y Movimientos de Pago") y al controlador backend `/api/v1/payments/transactions` para requerir el permiso ejecutivo de reportes (`reportes:ver_ventas`).
- **Comportamiento por Rol**: El **Rol Cajero** ya no puede ver la pestaña de Transacciones en el menú superior ni acceder al endpoint. Los **Administradores** mantienen el acceso completo.

## 📌 HotFix 2.2.1 — Acentos y Edición de Roles
- **Codificación de Acentos (Unicode UTF-8 / NVARCHAR)**: Se ejecutó actualización masiva en SQL Server `PosLambrinDb` para asegurar la correcta codificación de acentos (`Acceso total al sistema WPC Bajío`, `Operación del Punto de Venta y Cobro en Caja`, `Gerente General WPC Bajío`, `Público en General`).
- **Edición de Roles**: Confirmada la funcionalidad del Administrador para cambiar el rol asignado a cualquier usuario y gestionar los permisos del sistema.

## 📌 Funcionalidades Entregadas en v2.2.0
1. **Punto de Venta (PDV)**:
   - Botones rápidos renombrados a `Pieza +` y `Caja +`.
   - Filtro de búsqueda rápida integrado arriba de `📦 Catálogo rápido`.
   - Desglose detallado de piezas, cajas y m² en el carrito (`23 Pzas (2 Cjas + 3 Pzas) · $290.00 · 10.01 m²`).
   - Cobertura corregida para multiplicar la cantidad por la cobertura por pieza (`coveragePerUnitSqM`).
   - Incorporación de **Calculadora de m² de Lambrín** en la tarjeta de cobro (`pos-checkout`) con cálculo automático de piezas/cajas y adición en 1 clic.
   - Modal rápido para alta de clientes directamente desde caja por cajeros.
   - Incrementadas imágenes de tarjetas de 62px a 92px.
2. **Catálogo de Productos y Costo Neto**:
   - Inclusión del campo `Costo Neto / Inicial ($ MXN)` en el modal de alta/edición de productos.
   - Persistencia de `CostoUnitario` que alimenta Costo Neto (COGS) y Ganancia en los Movimientos de Inventario.
   - Encabezados bilingües en la tabla del catálogo (`Precio Menudeo / 零售价` y `Precio Mayoreo / 批发价`).
3. **Control de Clientes y Límites Diarios**:
   - Permiso `clientes:limite_diario` y campo `LimiteCajasDiarias` en entidad `Cliente`.
   - Validación autoritativa en `SaleApplicationService` que impide rebasar el límite diario de cajas.
   - Modal de Historial de Compras de Cliente para consulta de cajeros y administradores.
4. **Movimientos de Inventario, Turnos de Caja y Reportería Bilingüe**:
   - Folio limpio `Venta #X` en la columna Motivo de Movimientos de Inventario y folios secuenciales `CAJA-YYYYMMDD-1` en la tarjeta de caja (`cash-card`), turnos de caja, listado de historial y bitácora de auditoría.
   - Cancelación de Ventas restringida a Administradores (`ventas:cancelar`), con reintegración automática de existencias a `Stocks` y sincronización en tiempo real con el esperado del Corte de Caja.
   - Impuesto ajustado a `$0.00` para ventas no facturadas.
   - Exportaciones PDF y Excel con 100% de encabezados bilingües en Español y Chino Simplificado, con registro singleton de fuentes CJK para exportaciones de alto rendimiento en milisegundos.

## Resumen Ejecutivo de la Iteración

Se ha configurado la base de datos limpia de SQL Server con autenticación de usuario (`wpcadminaam`), se montó el esquema autoritativo de 26 tablas e insertaron las semillas de inicio. Adicionalmente, el Backend API y el Frontend SPA se compilaron en modo producción y se publicaron en los directorios de IIS (`C:\inetpub\wwwroot\pos-api` y `C:\inetpub\wwwroot\pos-web`).

### Configuración de Base de Datos SQL Server (SSMS 20):
- **Server name**: `.` (o `localhost`)
- **Authentication**: `SQL Server Authentication`
- **Login**: `wpcadminaam`
- **Password**: `Aaron2804#`
- **Database**: `PosLambrinDb` (26 tablas creadas)

### Estado del Despliegue IIS:
- **Frontend SPA (Punto de Venta)**: `http://localhost` (`C:\inetpub\wwwroot\pos-web`)
- **Backend API (.NET 9)**: `http://localhost:5000` (`C:\inetpub\wwwroot\pos-api`)

## Estado de la Suite de Pruebas
- Frontend Vitest: **24/24** pasadas (100%).
- Backend xUnit: **68/68** pasadas (100%).
- Pruebas Totales: **92/92** pasadas al 100%.

## Servidores de Desarrollo Activos
- Backend API (.NET 9): `http://localhost:5000`
- Frontend Web SPA (React + Vite): `http://localhost:5173`
