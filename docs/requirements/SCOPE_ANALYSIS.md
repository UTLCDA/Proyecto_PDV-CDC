# ANÁLISIS DE ALCANSE BASE — SISTEMA PUNTO DE VENTA LAMBRÍN

## 1. Requisitos Confirmados (Fase 1: Sistema Interno y Punto de Venta)

1. **Autenticación y Seguridad**:
   - Inicio de sesión con correo/usuario y contraseña.
   - Administración de usuarios, empleados, roles y matriz de permisos granulares (consultar, crear, editar, eliminar, aprobar, exportar).
2. **Catálogos Comerciales**:
   - Productos con clasificación multinivel, galería de imágenes, especificaciones técnicas, accesorios compatibles y control de visibilidad de ventas.
   - Doble modalidad de producto: precio visible para compra directa o modo sólo cotización.
   - Clientes con historial completo, direcciones guardadas y precios especiales para clientes mayoristas.
3. **Punto de Venta (PDV)**:
   - Panel principal responsivo adaptable a computadora, tableta y teléfono.
   - Carrito de compras con cálculo automático de totales e impuestos.
   - Venta con pago total o venta con anticipo/apartado (porcentaje de anticipo configurable por rol).
   - Escaneo de productos mediante pistola de código de barras USB (HID).
   - Modificación manual de precios y descuentos autorizados únicamente por rol administrativo.
   - Generación automática de recibos de pago en PDF por transacción.
4. **Inventario**:
   - Registro de existencias, entradas, salidas, ajustes de inventario y alertas de stock.
5. **Operación Comercial**:
   - Gestión de cotizaciones y conversión directa a pedidos.
   - Manejo de apartados y registro de abonos o transacciones parciales.
   - Módulo de devoluciones y gestión de reembolsos postventa.
   - Seguimiento de envíos y entregas.
6. **Soporte Documental**:
   - Plantillas de contratos electrónicos editables en el módulo.
   - Autocompletado de datos del cliente, pedido, montos y anticipos.
   - Exportación de contratos en PDF formato A4.
   - Carga opcional de documentos de cliente (comprobante de domicilio, identificaciones, PDFs, imágenes) vinculados al expediente del cliente/pedido.
7. **Bitácora y Trazabilidad**:
   - Sistema de registros 100% trazable e inmutable.
   - Registro automático de usuario, acción, entidad, ID, fecha/hora UTC exactas, valores anteriores y valores nuevos.
   - Registros protegidos contra modificación o eliminación por cualquier usuario.
8. **Caja y Cierre**:
   - Apertura de caja, asignación de turnos, ingresos, retiros, cierre de turno y cortes de caja.
9. **Reportes y Exportaciones**:
   - Consultas de reportes generales y exportación a PDF y Excel.
10. **Internacionalización**:
    - Interfaz de usuario bilingüe: Español (`es`) y Chino Simplificado (`zh-CN`).

---

## 2. Supuestos Registrados

- **Base de Datos**: SQL Server 2022 / Azure SQL Database.
- **Zonas Horarias**: Almacenamiento interno de fechas en UTC y conversión a hora local (`America/Mexico_City`) en la interfaz visual.
- **Moneda**: Moneda principal en Pesos Mexicanos (MXN), con estructura preparada (`CurrencyCode`) para multi-moneda en la Fase 2.
- **Almacenamiento de Archivos**: Almacenamiento inicial en el sistema de archivos local del servidor con abstracción de servicio `IFileStorageService` para migración transparente a Azure Blob Storage.
- **Formato A4**: Los documentos y contratos se renderizarán en PDF estándar A4 con tipografías Unicode incrustadas para soporte de caracteres chinos y españoles.

---

## 3. Preguntas Abiertas

- **OQ-001**: Tipo de impresión de recibos de caja (¿Impresora térmica de tickets POS directa por puerto serie/USB vs impresión PDF estándar?).
- **OQ-002**: Definición legal final de los textos de contratos de apartado y venta de Lambrín.
- **OQ-003**: Ubicación de despliegue en producción (Azure App Service vs Servidor IIS On-Premise).

---

## 4. Riesgos Identificados

- **R-001**: Objetivo comercial estimado de 3 semanas para la Fase 1 frente a la densidad de 30 submódulos funcionalmente complejos.
- **R-002**: Eventos de teclado desfasados al usar lectores de código de barras USB en diferentes sistemas operativos o navegadores.
- **R-003**: Formato de renderizado PDF con caracteres en Chino Simplificado y saltos de página en contratos A4.

---

## 5. Funcionalidades Fuera del Alcance (Out of Scope - Fase 1)

- **E-Commerce Público (Fase 2)**: Tienda web abierta al público con registro autogestionado de clientes externos.
- **Atención al Cliente y Tickets (Fase 2)**: Módulo de tickets de soporte, reclamos postventa públicos y mensajería.
- **Integraciones con Pasarelas de Pago**: Pagos en línea vía Stripe, MercadoPago o Paypal (Fase 2).
- **Integración API con Paqueterías**: Conexión directa en tiempo real con APIs de Fedex, DHL o Estafeta (el seguimiento en Fase 1 es mediante estados y folios internos).
- **Motor Genérico de Flujos de Trabajo**: Automatización de workflows dinámicos personalizables (se usan estados y catálogos configurables simples).
- **Facturación Electrónica CFDI 4.0**: No requerida formalmente dentro del alcance del PDV interno de la primera fase.
