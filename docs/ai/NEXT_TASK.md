# NEXT TASK — Siguiente Tarea Recomendada

## 📌 Estado Actual

- **Rama Git Activa**: `mantenimiento-observaciones-18-septiembre` -> `main`
- **Estado de Trabajo**: VoBo concedido por el usuario para commit, integración a `main` y despliegue a servidores.

## 📌 Siguiente Tarea Recomendada

Subir los cambios a la rama remota, fusionar a `main`, compilar en los servidores y verificar el correcto levantamiento de los servicios.

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
11. Validar el modal de movimiento de inventario con buscador predictivo.
12. Validar el nuevo módulo de **Recibos de Compra**: traducción completa en español y chino (columnas, filtros, botones, modal y formulario), alta, edición y comprobante voucher.
13. Recibir el VoBo del usuario para proceder al commit y push de la rama.
