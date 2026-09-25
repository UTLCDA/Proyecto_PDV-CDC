# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git**: `main`
- **Estado de Trabajo**: Cambios consolidados, validados al 100% con pruebas backend (97/97) y frontend (47/47) y build de producción exitoso. Cambios subidos a `main`.

## 📌 Siguiente Tarea Recomendada

Verificar y compilar ambos aplicativos en los entornos correspondientes (VPS / Servidor / Cloudflare), asegurando que los servicios se encuentren arriba y respondiendo con normalidad.

### Criterios de Aceptación para Cierre de Tarea
1. Validar en `localhost` que el Punto de Venta se ajuste correctamente con zoom al 80% y 60%.
2. Validar que la búsqueda por SKU / código de barras funcione con o sin guiones y con caracteres de Mac.
3. Validar que al cobrar con tarjeta o pago mixto sea obligatorio ingresar la referencia bancaria y se muestre la alerta si falta.
4. Validar el combo de categorías mostrando los 104+ productos y el spinner de carga.
5. Validar la regla de mayoreo para *Lambrin Interior 格栅板* en el carrito y que el desglose de mayoreo no se desborde.
6. Validar la calculadora de m² dual: diseño con color y estado activo en los botones, traducción 100% al chino y español, y selección mediante autocompletado flotante con pill de producto y botón cambiar.
7. Validar el descuento manual en porcentaje (ej. 15 = 15%) y recálculo correcto de base gravable e IVA (16%).
8. Validar el comprobante de venta térmico: exclusivamente en español y sin el badge "PRÓXIMAMENTE" en `www.wpcbajio.com`.
9. Validar los campos de Login vacíos por defecto y el nuevo footer.
10. Validar la generación del contrato en Chino al guardar en Comercial.
11. Validar el modal de movimiento de inventario con buscador predictivo y etiquetas bilingües.
12. Validar el módulo de **Recibos de Compra**: traducción completa en español y chino (columnas, filtros, botones, modal y formulario), alta, edición y comprobante voucher.
13. Validar la **traducción al chino (zh-CN)** en los 4 módulos reportados:
    - **Pedidos Web (CDC)**: Título, subtítulo, tarjetas de métricas, filtros, tabla y modal de asignación de guía de rastreo.
    - **Control de Inventarios**: Título y descripción principal traducidos reactivamente al chino (`WPC Bajío 库存管理`).
    - **Catálogo de Categorías**: Título, descripción, selector de estado, buscador y modal de alta/edición 100% en chino.
    - **Corte de Turno y Caja**: Desglose de Corte Z (`Esperado en Caja`, `Fondo`, `Ingresos`, `Ventas/Abonos Efectivo`, `Retiros`) y advertencias de contingencia.
14. Validar la **trazabilidad de Stock Previo y Stock Final**:
    - En la tabla de **Movimientos de Inventario**: verificar que la tabla cargue ordenada por fecha más reciente primero (`Fecha / 日期` descendente con indicador ▼ activo) para que cualquier venta o ajuste reciente aparezca en la parte superior.
    - Verificar las columnas `Stock Previo / 原库存`, `Cantidad / 数量` y `Stock Final / 最终库存` para ventas, devoluciones, ajustes, entradas y salidas, así como el ordenamiento y la exportación a Excel y PDF.
    - En el modal de **Captura de Movimiento / Ajuste**: verificar que al seleccionar un producto y seleccionar "Ajuste", "Entrada" o "Salida" se previsualicen en vivo: Stock Anterior, Variación con diferencia neta y Stock Resultante.
15. Recibir el VoBo del usuario para proceder al commit y push de la rama.
