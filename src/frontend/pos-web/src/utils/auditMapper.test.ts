import { describe, expect, it } from 'vitest';
import { mapAuditEvent } from './auditMapper';
import { AuditLog } from '../types/reports';

describe('auditMapper', () => {
  it('maps structured SALE_CREATED audit log correctly', () => {
    const log: AuditLog = {
      id: '1',
      idVenta: 154,
      correlationId: 'corr-123',
      userUsername: 'Aaron',
      action: 'SALE_COMPLETED',
      entityName: 'Venta',
      entityId: 'guid-123',
      newValues: JSON.stringify({
        schemaVersion: 1,
        module: 'Ventas',
        eventType: 'SALE_CREATED',
        resultStatus: 'SUCCESS',
        payload: { IdVenta: 154, MontoTotal: 4850.00 }
      }),
      ipAddress: '127.0.0.1',
      notes: 'Venta #154 completada.',
      createdAtUtc: '2026-08-17T18:42:15Z'
    };

    const mapped = mapAuditEvent(log);
    expect(mapped.module).toBe('Ventas');
    expect(mapped.icon).toBe('🛒');
    expect(mapped.title).toBe('Venta #154 registrada');
    expect(mapped.statusText).toBe('Correcto');
    expect(mapped.statusClass).toBe('success');
  });

  it('maps legacy technical audit log with graceful fallback', () => {
    const log: AuditLog = {
      id: '2',
      correlationId: 'corr-456',
      userUsername: 'David',
      action: 'PUT /api/Productos/45',
      entityName: 'HttpRequest',
      entityId: '200',
      ipAddress: '192.168.1.10',
      notes: 'HTTP Response StatusCode: 200',
      createdAtUtc: '2026-08-17T18:42:15Z'
    };

    const mapped = mapAuditEvent(log);
    expect(mapped.module).toBe('Productos');
    expect(mapped.icon).toBe('📦');
    expect(mapped.statusText).toBe('Correcto');
  });

  it('computes field diffs correctly for previous vs new values', () => {
    const log: AuditLog = {
      id: '3',
      correlationId: 'corr-789',
      userUsername: 'Aaron',
      action: 'PRODUCT_UPDATED',
      entityName: 'Producto',
      entityId: 'prod-1',
      oldValues: JSON.stringify({ UnitPrice: 580.0, IsActive: true }),
      newValues: JSON.stringify({
        schemaVersion: 1,
        module: 'Productos',
        eventType: 'PRODUCT_UPDATED',
        resultStatus: 'SUCCESS',
        payload: { UnitPrice: 620.0, IsActive: true }
      }),
      ipAddress: '127.0.0.1',
      notes: 'Producto actualizado: Lambrín WPC Nogal',
      createdAtUtc: '2026-08-17T18:42:15Z'
    };

    const mapped = mapAuditEvent(log);
    expect(mapped.changes).toEqual([
      { field: 'Precio Menudeo', oldValue: '$580.00', newValue: '$620.00' }
    ]);
  });
});
