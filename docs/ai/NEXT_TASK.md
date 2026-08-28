# NEXT_TASK — Siguiente Tarea Recomendada

## 📌 Tarea Actual Recomendada: Módulo de Carrito de Compras, Cobro en Caja y Punto de Venta (v3.0.0 Feature)

### 🎯 Objetivo
Desarrollar e integrar el flujo principal de venta rápida en la interfaz del Punto de Venta (`💰 Punto de Venta / Caja`):
- Selección rápida de productos vía escáner de código de barras USB y buscador dinámico.
- Carrito de compras reactivo con cálculo automático de unidades, cajas completas y aplicación transparente de reglas de precio (Menudeo vs. Mayoreo por caja).
- Asignación de cliente (General o Registrar/Buscar Cliente Mayorista).
- Métodos de cobro (Efectivo, Tarjeta, Transferencia, Mixto o Registro de Abonos) y generación de Ticket / Comprobante de Venta.

---

### 📋 Criterios de Aceptación

1. **Lectura con Escáner USB**: Al escanear un código de barras en la pantalla de cobro, el producto se agrega o incrementa automáticamente en el carrito.
2. **Cálculo de Precios e Inventario**: Aplicar regla de mayoreo cuando la cantidad de piezas iguale o supere el contenido de caja. Validar existencias disponibles en stock.
3. **Flujo de Pago y Ticket**: Generación del registro de venta y apertura del modal/visor de ticket imprimible.
4. **Pruebas y Auditoría**: Pruebas unitarias/integración al 100% y registro auditado en bitácora de transacciones (`AuditLog`).

---

### 📚 Archivos Relevantes
- `src/frontend/pos-web/src/pages/Sales/PointOfSalePage.tsx`
- `src/backend/Pos.Api/Controllers/v1/SalesController.cs`
- `src/backend/Pos.Application/Sales/Services/SaleApplicationService.cs`
- `docs/deployment/CLOUDFLARED_TUNNEL_SETUP.md`
