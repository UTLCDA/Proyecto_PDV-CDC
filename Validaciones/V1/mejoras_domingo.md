## 💵 Turno de Caja y Arqueo (Corte X/Z)
 
1. me sigue mostrando Ya existe un turno de caja abierto. Ejecute el Corte Z antes de abrir uno nuevo. , no me permite cerrar el turno. si no puedo aperturar que el administrador tenga permiso especial para que aparezca el boton de generar corte Z.

## Reportes Ejecutivos WPC Bajío

1.en la card de Resumen de inventario , el titulo esta en ingles "lowStockProductDetail",

 traducirlo en español. 

## Cotizaciones y Presupuestos

1. cuando se va realizar <button class="pos-link-btn">⚡ Convertir y cobrar</button> esto tambien debe de validar si el turno de caja esta abierto, no debe permitir pagar, abonar .

## Abonos a Saldos Pendientes

1. En este modulo, cuando se selecciona una <option value="">-- Seleccione una venta pendiente --</option> aparece el historial de abonos <h3>Historial de abonos</h3>
<div class="commercial-history">, para mejor control, tambien debe de tener un apartado o accion, para consultar el comprovante.

2. en el div commercial-global-history, añadir un buen diseño a la tabla, añadir columnas por ejemplo id venta , monto pago, y los <input type="date" value=""> los valores sean a la fecha actual , los tipo de pago añadirles iconos para mejor entendimiento, dar mejor formato con mas claridad.

## Transacciones 

1. este modulo es igual que el de Abonos a Saldos Pendientes , funcionalidad de este modulo es que, permita consultar y solo debe de aparecer el historico de pagos echos, abonos, pagos con transferencia , pagos con tarjeta, devoluciones con el fin de que consulten que pagos se han echo en el dia. 

## Plantillas y Generación de Contratos A4

1.en esta parte veo que hay una descripcion donde dice Variables disponibles: {{FOLIO}}, {{CLIENTE}}, {{TOTAL}}, {{SALDO}} y {{FECHA}}., estas pueden ser dinamicas para que al momento de que esten generando el contrato, mediante un texto que ya este fijo y este me lo generes de acuerdo a las variables, se pueda generar de mejor manera.

2. Hacer un diseño con el logo de este contrato, ya tienes el logo oficial

## Movimientos de Inventario

1. Los filtros no funcionan para algunos <select class="form-control" aria-label="Tipo de Movimiento">, ejemplo Ventas y filtras por un rango de fechas, entre 01/08/2026 al 08/08/2026 estas no me muestran informacion donde si exiten ventas, validar para todos los movimientos.

## Directorio de Clientes WPC Bajío

1. la columna customerStatus esta en ingles, y el estatus tambien esta en ingles inactiveStatus, traducir en español.


## Punto de Venta WPC Bajío

1. en la card pos-card pos-daily-summary, vienen en ingles todaySalesCount y todaySalesTotal traducir en español.

## Histórico de Ventas

1. en el form donde estan los filtros de fecha , todos los clientes, ajustar ya que no se sabe cual es la fecha inicio y fecha fin. 

2. la card <article class="card"><span>✅ Monto Pagado</span><strong>$NaN</strong></article> vienen con un formato en $nan, revisar ya que debe de calcular lo que se ha pagado al dia, abonos,pagos etc.

3. <article class="card"><span>⏳ Saldo Pendiente</span><strong>$NaN</strong></article> tambien para esta parte si no hay valor poner un $ 0.00

4. validar los filtros de <option value="PendientePago">Apartado / Con Saldo</option> no carga nada.

