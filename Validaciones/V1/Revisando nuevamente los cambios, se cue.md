Revisando nuevamente los cambios, se cuentran los siguientes detalles :

## 🛒 Punto de Venta WPC Bajío

1. Los comprobantes con la nueva estructura , ahora cuando es Pago total en efectivo trae paymentMethodTitle y fullPaymentConfirmed 
traducir en español.

2. Cuando es pago mixto , trae mixedPaymentBreakdown y aparte trae la leyenda de  (Anticipo Inicial) , cuando este fue una venta y se pago en su totalidad.

## 🧾 Histórico de Ventas

1. Cuando se ingresa al modulo me trae todas las ventas, y no respeta los filtros de busqueda por las fechas.
2.Tambien los montos no son dinamicos de la card sales-history-metrics, estos se deben de actualizar al momento que de filtra 
3. en la card sales-history-table-wrap > Estado las etiquetas estan ApartadoPagado sin espacio el texto esta pegado, corregir esto.

## 💵 Turno de Caja y Arqueo (Corte X/Z)

1.  sigue sin permitirme ingresar dinero , me da "Error de red o servidor"

2. en 📊 Movimientos Generales del Día , en la <th>Tipo Movimiento</th> y <th>Descripción</th> siguen estando vacio, para un mejor control visual
cuando en <th>Categoría</th> sea Abono en <th>Descripción</th> Poner leyenda : Abono a ventaId xxxx,
cuando en <th>Categoría</th> sea Retiro / Sangría <th>Descripción</th> Poner leyenda lo que se escribio en Motivo del retiro *
cuando en <th>Categoría</th> sea venta <th>Descripción</th> Venta ID  
cuando en <th>Categoría</th> sea CorteX <th>Descripción</th> Venta ID  

3. en la card cash-card__heading , el cash-transaction-badge no debe de traer los tipo de movimiento Abono en efectivo, ya que este card solo
es para movimientos Apertura, retiros y cierre registrados en esta caja. no movimientos de venta , abonos, devoluciones.

## 📑 Cotizaciones y Presupuestos

1. En la nueva accion implementada, <button type="button" class="pos-link-btn">👁️ Ver Cotización</button>, en el div quotes-summary y en el <span>Descuento<b></b></span> su texto deberia ser, Abonos , y añadir otro span de descuentos ya que descuentos confunde con abonos.

2. de la quotes-table-wrap añadir una columna que tenga cuando inicio la cotizacion, ya que solo tiene la vigencia.

## 💰 Abonos a Saldos Pendientes

1.En la class commercial-global-history, se encuentran los commercial-history-filters , añadir un nuevo filtro de clientes, y el <input placeholder="Buscar abono por folio o cliente..." value=""> este quede solo para buscar por folio id

## 💳 Histórico de Transacciones y Movimientos de Pago

1. en la class commercial-history-table-wrap añadir una columna que se llame Movimiento, abono y venta ya que tambien ayudara a tener mas control de las transacciones.

2. En este modulo, no me trae el registro de cuando de dio el 1er apartado del abono o apartado, por ejemplo de la venta VENTA-20260808-54BA19CC46FB4 , deben de ver 3 registros, el 1er de Efectivo: $500.00 · 8 ago 2026, 10:22 a.m. (Anticipo Inicial)
2do. de Transferencia: $542.83 · 8 ago 2026, 10:25 a.m. y tercero de Efectivo: $0.01 · 10 ago 2026, 5:56 a.m., en todos los casos cuando genera un apartado desde el modulo Punto de Venta WPC Bajío , y este se registra el primer apartado, no lo muestra en este modulo.

