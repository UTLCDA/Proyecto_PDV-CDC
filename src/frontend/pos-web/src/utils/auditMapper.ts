import { AuditLog } from '../types/reports';
import { formatShiftFolio } from './operationalDate';

export interface AuditMappedEvent {
  module: string;
  icon: string;
  title: string;
  description: string;
  statusText: string;
  statusClass: 'success' | 'warning' | 'error';
  entityDisplay: string;
  changes: Array<{ field: string; oldValue: string; newValue: string }>;
  parsedPayload?: Record<string, unknown> | null;
  rawOldJson?: string;
  rawNewJson?: string;
}

export const MODULE_ICONS: Record<string, string> = {
  Ventas: '🛒',
  Clientes: '👥',
  Productos: '📦',
  Inventario: '🏭',
  Caja: '💵',
  Pagos: '💰',
  Cotizaciones: '📑',
  Devoluciones: '↩️',
  Usuarios: '👤',
  Roles: '🛡️',
  Seguridad: '🔒',
  Configuracion: '⚙️',
  Sistema: '⚙️',
  HttpRequest: '🌐',
  General: '📋'
};

export function mapAuditEvent(log: AuditLog): AuditMappedEvent {
  const parsedNew = parseJsonSafe(log.newValues);
  const parsedOld = parseJsonSafe(log.oldValues);

  // Extract structured metadata if present (schemaVersion: 1)
  const metaModule = log.module || extractStringProp(parsedNew, 'module');
  const metaEventType = log.eventType || extractStringProp(parsedNew, 'eventType') || log.action;
  const metaResultStatus = log.resultStatus || extractStringProp(parsedNew, 'resultStatus');

  const effectiveModule = deriveModule(log.entityName, log.action, metaModule);
  const icon = MODULE_ICONS[effectiveModule] || '📋';

  const { statusText, statusClass } = deriveStatus(log, metaResultStatus);
  const title = deriveTitle(log, metaEventType, effectiveModule, parsedNew);
  const description = deriveDescription(log, parsedNew);

  const payload = extractPayload(parsedNew);
  const changes = computeFieldDiffs(parsedOld, parsedNew, payload);

  const saleRef = log.idVenta ? `Venta #${log.idVenta}` : '';
  const formattedEntityId = log.entityId ? formatShiftFolio(log.entityId) : '';
  const entityDisplay = saleRef
    ? `${log.entityName} · ${saleRef}`
    : formattedEntityId
    ? `${log.entityName} · ${formattedEntityId}`
    : log.entityName;

  return {
    module: effectiveModule,
    icon,
    title,
    description,
    statusText,
    statusClass,
    entityDisplay,
    changes,
    parsedPayload: payload,
    rawOldJson: log.oldValues,
    rawNewJson: log.newValues
  };
}

function deriveModule(entityName: string, action: string, metaModule?: string): string {
  if (metaModule && MODULE_ICONS[metaModule]) return metaModule;

  const entity = (entityName || '').toLowerCase();
  const act = (action || '').toLowerCase();

  if (entity.includes('venta') || act.includes('sale')) return 'Ventas';
  if (entity.includes('cliente') || act.includes('customer')) return 'Clientes';
  if (entity.includes('producto') || entity.includes('categoria') || act.includes('product') || act.includes('category')) return 'Productos';
  if (entity.includes('existencia') || entity.includes('movimiento') || act.includes('inventory') || act.includes('stock')) return 'Inventario';
  if (entity.includes('turno') || entity.includes('caja') || act.includes('cash')) return 'Caja';
  if (entity.includes('abono') || act.includes('payment') || act.includes('installment')) return 'Pagos';
  if (entity.includes('cotizacion') || act.includes('quote')) return 'Cotizaciones';
  if (entity.includes('devolucion') || act.includes('return')) return 'Devoluciones';
  if (entity.includes('usuario') || act.includes('user')) return 'Usuarios';
  if (entity.includes('rol') || entity.includes('permiso') || act.includes('role')) return 'Roles';
  if (act.includes('login') || act.includes('logout') || act.includes('auth')) return 'Seguridad';
  if (entity.includes('plantilla') || act.includes('template')) return 'Configuracion';
  if (entity === 'httprequest') return 'Sistema';

  return 'General';
}

function deriveStatus(log: AuditLog, metaStatus?: string): { statusText: string; statusClass: 'success' | 'warning' | 'error' } {
  if (metaStatus === 'ERROR') return { statusText: 'Error del sistema', statusClass: 'error' };
  if (metaStatus === 'WARNING') return { statusText: 'Advertencia / No completado', statusClass: 'warning' };
  if (metaStatus === 'SUCCESS') return { statusText: 'Correcto', statusClass: 'success' };

  const act = (log.action || '').toUpperCase();
  const entityId = (log.entityId || '').toString();

  if (act.includes('FAILED') || entityId === '400' || entityId === '404') {
    return { statusText: 'No completado', statusClass: 'warning' };
  }
  if (entityId === '401') {
    return { statusText: 'Acceso no autorizado', statusClass: 'warning' };
  }
  if (entityId === '403') {
    return { statusText: 'Sin permisos', statusClass: 'error' };
  }
  if (entityId === '500' || entityId.startsWith('5')) {
    return { statusText: 'Error del sistema', statusClass: 'error' };
  }

  return { statusText: 'Correcto', statusClass: 'success' };
}

function deriveTitle(log: AuditLog, eventType: string, module: string, parsedNew: Record<string, unknown> | null): string {
  const evt = (eventType || log.action || '').toUpperCase();

  if (evt.includes('SALE_COMPLETED') || evt.includes('SALE_CREATED')) {
    return log.idVenta ? `Venta #${log.idVenta} registrada` : 'Nueva venta registrada';
  }
  if (evt.includes('CUSTOMER_CREATED') || evt.includes('CLIENT_CREATED')) return 'Nuevo cliente registrado';
  if (evt.includes('CUSTOMER_UPDATED') || evt.includes('CLIENT_UPDATED')) return 'Datos de cliente actualizados';
  if (evt.includes('PRODUCT_CREATED')) return 'Nuevo producto registrado';
  if (evt.includes('PRODUCT_UPDATED')) return 'Producto actualizado';
  if (evt.includes('PRODUCT_PRICE_UPDATED')) return 'Precio de producto actualizado';
  if (evt.includes('CATEGORY_CREATED')) return 'Nueva categoría creada';
  if (evt.includes('CATEGORY_UPDATED')) return 'Categoría actualizada';
  if (evt.includes('INVENTORY_INCREASED') || evt.includes('STOCK_MOVEMENT_ENTRADA')) return 'Entrada de inventario';
  if (evt.includes('INVENTORY_DECREASED') || evt.includes('STOCK_MOVEMENT_SALIDA')) return 'Salida de inventario';
  if (evt.includes('INVENTORY_ADJUSTED') || evt.includes('STOCK_MOVEMENT_AJUSTE')) return 'Ajuste de inventario';
  if (evt.includes('CASH_SHIFT_OPENED')) return 'Turno de caja aperturado';
  if (evt.includes('CASH_SHIFT_CLOSED')) return 'Corte Z / Cierre de caja realizado';
  if (evt.includes('CASH_DEPOSIT')) return 'Ingreso de dinero a caja';
  if (evt.includes('CASH_WITHDRAWAL')) return 'Sangría / Retiro de caja';
  if (evt.includes('CASH_CUT_CREATED') || evt.includes('CASH_X_REPORT')) return 'Corte X de caja consultado';
  if (evt.includes('QUOTE_CREATED')) return 'Cotización creada';
  if (evt.includes('LAYAWAY_CONVERTED') || evt.includes('QUOTE_CONVERTED')) return 'Cotización convertida a venta';
  if (evt.includes('PAYMENT_CREATED') || evt.includes('PAYMENT_INSTALLMENT')) return log.idVenta ? `Abono a Venta #${log.idVenta} registrado` : 'Abono registrado';
  if (evt.includes('RETURN_CREATED') || evt.includes('SALE_RETURN')) return log.idVenta ? `Devolución de Venta #${log.idVenta} procesada` : 'Devolución procesada';
  if (evt.includes('USER_CREATED')) return 'Nuevo usuario creado';
  if (evt.includes('USER_UPDATED')) return 'Usuario actualizado';
  if (evt.includes('ROLE_CREATED')) return 'Nuevo rol creado';
  if (evt.includes('ROLE_UPDATED')) return 'Rol actualizado';
  if (evt.includes('LOGIN_SUCCESS')) return 'Inicio de sesión exitoso';
  if (evt.includes('LOGIN_FAILED')) return 'Intento fallido de inicio de sesión';
  if (evt.includes('LOGOUT')) return 'Cierre de sesión';
  if (evt.includes('DOCUMENT_TEMPLATE')) return 'Plantilla contractual guardada';

  if (log.notes && !log.notes.startsWith('HTTP')) return log.notes;

  return `${module} — Operación ${log.action}`;
}

function deriveDescription(log: AuditLog, parsedNew: Record<string, unknown> | null): string {
  const user = log.userUsername || 'Sistema';

  if (log.notes && !log.notes.startsWith('HTTP')) {
    const formattedNotes = formatShiftFolio(log.idVenta ? log.notes.replace(/VENTA-[A-Z0-9-]+/gi, `Venta #${log.idVenta}`) : log.notes);
    return `${user}: ${formattedNotes}`;
  }

  const payload = extractPayload(parsedNew);
  if (payload) {
    if (payload.Nombre || payload.Name) {
      return `${user} operó sobre el registro "${payload.Nombre || payload.Name}".`;
    }
    if (payload.NumeroFolio || payload.IdVenta) {
      return `${user} procesó la Venta #${payload.IdVenta || payload.NumeroFolio}.`;
    }
  }

  return `${user} ejecutó la acción "${log.action}".`;
}

function parseJsonSafe(jsonStr?: string): Record<string, unknown> | null {
  if (!jsonStr || typeof jsonStr !== 'string') return null;
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function extractPayload(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  if (parsed.payload && typeof parsed.payload === 'object') {
    return parsed.payload as Record<string, unknown>;
  }
  return parsed;
}

function extractStringProp(obj: Record<string, unknown> | null, propName: string): string | undefined {
  if (!obj) return undefined;
  const val = obj[propName];
  return typeof val === 'string' ? val : undefined;
}

function computeFieldDiffs(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null,
  extractedPayload: Record<string, unknown> | null
): Array<{ field: string; oldValue: string; newValue: string }> {
  const diffs: Array<{ field: string; oldValue: string; newValue: string }> = [];
  const oldData = extractPayload(oldObj);
  const newData = extractedPayload || extractPayload(newObj);

  if (!oldData && !newData) return diffs;

  const allKeys = new Set<string>([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {})
  ]);

  const ignoredKeys = new Set(['schemaVersion', 'module', 'eventType', 'resultStatus', 'payload']);

  allKeys.forEach(key => {
    if (ignoredKeys.has(key)) return;

    const oldVal = oldData ? oldData[key] : undefined;
    const newVal = newData ? newData[key] : undefined;

    const oldStr = formatVal(oldVal, key);
    const newStr = formatVal(newVal, key);

    if (oldStr !== newStr && (oldStr !== '—' || newStr !== '—')) {
      diffs.push({
        field: translateFieldName(key),
        oldValue: oldStr,
        newValue: newStr
      });
    }
  });

  return diffs;
}

function formatVal(val: unknown, fieldKey?: string): string {
  if (val === undefined || val === null || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sí / Activo' : 'No / Inactivo';
  if (typeof val === 'number') {
    const isCurrencyField = fieldKey && /price|precio|monto|amount|saldo|balance|total|descuento|discount|iva|reembolso/i.test(fieldKey);
    if (isCurrencyField || !Number.isInteger(val)) {
      return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(val);
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function translateFieldName(key: string): string {
  const map: Record<string, string> = {
    Nombre: 'Nombre',
    Name: 'Nombre',
    PrecioUnitario: 'Precio Menudeo',
    PrecioMayoreo: 'Precio Mayoreo',
    UnitPrice: 'Precio Menudeo',
    WholesalePrice: 'Precio Mayoreo',
    CantidadDisponible: 'Existencia Disponible',
    MontoTotal: 'Monto Total',
    MontoDescuento: 'Descuento',
    MontoIva: 'IVA',
    EstaActivo: 'Estatus Activo',
    IsActive: 'Estatus Activo',
    TipoCliente: 'Tipo de Cliente',
    PorcentajeDescuentoEspecial: 'Descuento Especial',
    Telefono: 'Teléfono',
    Phone: 'Teléfono',
    Email: 'Correo Electrónico',
    Rfc: 'RFC',
    Status: 'Estado',
    Estado: 'Estado',
    RoleName: 'Rol Asignado',
    Ubicacion: 'Ubicación'
  };
  return map[key] || key;
}
