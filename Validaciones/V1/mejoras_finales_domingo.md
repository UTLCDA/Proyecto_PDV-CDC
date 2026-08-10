## Punto de Venta WPC Bajío

1. En la card pos-cart-item en <button type="button" aria-label="decreaseQuantity">−</button> se empalma con <b>$6,796.00</b> esta etiqueta.
revisar que no se empalme.

2. En esta card pos-card pos-daily-summary, el contabilizador de Ventas Realizadas Hoy no va acorde a las ventas del dia , debe de ser dinamico , como el Monto Total Vendido HOY. debe de consultar en base a los movimientos del dia ya se por turno de caja como mejor control.

3. del modulo de 📦 Catálogo de Productos WPC Bajío, hay una funcionalidad de cobertuta, <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--background-container); color: var(--text-secondary); font-size: 0.75rem; width: fit-content;">📐 0.25 m²/pza</span> y <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: var(--background-selected); border: 1px solid var(--border-hover); color: var(--primary-main); font-size: 0.75rem; width: fit-content; font-weight: bold;">📦 Caja: 2.25 m²</span>
implementarlo y que no se amontone con un diseño donde se vea bien al <div class="pos-totals"><span>Subtotal<b>$1,250.00</b></span><span>Impuesto IVA<b>$200.00</b></span><span>Cobertura<b>0.25 m²</b></span><span class="pos-total">Total a Pagar<b>$1,450.00</b></span></div> para mejor interaccion con el usuario.

## 💵 Turno de Caja y Arqueo (Corte X/Z)

1. el boton , solo debe de aparecer cuando exista un turno abierto a un dia despues, es decir, solo aparecer cuando sea a un dia despues.
2. En el modal cash-deposit-title no me permite añadir entradas de dinero al turno .

## Comprobante ticket 

1. Mejorar el formato de ticket que se vea mas intuitivo, trae una parte que dice paymentHistory debe de estar en español.

## Cotizaciones y Presupuestos

1. en la quotes-table-wrap añadir una columna que contenga los productos cotizados, tambien un boton que pueda ver la cotizacion creada, ver piezas, monto, iva etc solo ver . nada de editar como el modal de Crear cotización pero solo pueda ver la info.

2. en el modal de Crear cotización, esta <option value="" disabled="">selectCustomerRequired</option> en ingles ponerla en español.

3. en la etiqueta <input required="" type="number" min="1" step="1" placeholder="Cantidad" value=""> el placeholder en vez de cantidad ponerle por default 0

## Abonos a Saldos Pendientes

1. Cuando se muestra commercial-history , dar un mejor formato donde no se vea amontonado el abono, saldo, y la accion del <button type="button" class="pos-link-btn">👁️ Recibo</button>

2. El hostorico de Historial Global de Abonos, solo debe de mostrar abonos, nada de ventas.

3. añadir etiquetas label a las input de tipo fecha, fechas inicial y fecha final.

4. esta una columna en ingles , amountPaid traducir en español


## ↩️ Devoluciones y Restitución de Stock

1. Mejorar el diseño de commercial-grid que se vea entendible, con iconos devolucion. fecha de devolucioin en columna aparte.



## Histórico de Transacciones y Movimientos de Pago

1. en los input de fecha agregar un label de fecha inicio y fecha final 

2. existe una columna amountPaid traducir en español


