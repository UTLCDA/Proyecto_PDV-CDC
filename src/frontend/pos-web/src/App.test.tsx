import { describe, it, expect } from 'vitest';
import i18n from './i18n';
import { AppTab, canAccessTab, permissionCodes, systemRoleNames } from './security/accessControl';

describe('WPC Bajío Frontend Tests', () => {
  it('i18n should translate Cash Shift and Reports in ES and ZH', () => {
    expect(i18n.t('cashShiftTitle')).toBe('Turno de Caja y Arqueo (Corte X/Z)');
    expect(i18n.t('topSellingProducts')).toBe('Productos Más Vendidos');

    i18n.changeLanguage('zh');
    expect(i18n.t('cashShiftTitle')).toBe('班次与钱箱清算 (X/Z 扎帐)');
    expect(i18n.t('topSellingProducts')).toBe('热销产品榜单');

    // Reset back to Spanish
    i18n.changeLanguage('es');
  });

  it('i18n should translate inventory movement types in ES and ZH', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('movementEntry')).toBe('Entrada');
    expect(i18n.t('movementExit')).toBe('Salida');
    expect(i18n.t('movementAdjustment')).toBe('Ajuste');
    expect(i18n.t('previousQuantity')).toBe('Cantidad Anterior');
    expect(i18n.t('physicalEvidence')).toBe('Evidencia');
    expect(i18n.t('physicalEvidenceDialogTitle')).toBe('Evidencia Física del Movimiento');

    await i18n.changeLanguage('zh');
    expect(i18n.t('movementEntry')).toBe('入库');
    expect(i18n.t('movementExit')).toBe('出库');
    expect(i18n.t('movementAdjustment')).toBe('盘点调整');
    expect(i18n.t('previousQuantity')).toBe('变动前数量');
    expect(i18n.t('physicalEvidence')).toBe('凭证');
    expect(i18n.t('physicalEvidenceDialogTitle')).toBe('库存变动实物凭证');

    await i18n.changeLanguage('es');
  });

  it('cashier permissions should expose only the point of sale module', () => {
    const cashierPermissions = [
      permissionCodes.salesProcess,
      'catalogo:productos_ver',
      'clientes:ver'
    ];
    const restrictedTabs: AppTab[] = [
      'shift',
      'reports',
      'quotes',
      'commercial',
      'catalog',
      'inventory',
      'customers',
      'users'
    ];

    expect(canAccessTab(cashierPermissions, 'pos')).toBe(true);
    expect(canAccessTab(cashierPermissions, 'profile')).toBe(true);
    restrictedTabs.forEach(tab => expect(canAccessTab(cashierPermissions, tab)).toBe(false));
  });

  it('administrator permissions should expose every application module', () => {
    const administratorPermissions = Object.values(permissionCodes);
    const applicationTabs: AppTab[] = [
      'pos',
      'shift',
      'reports',
      'quotes',
      'commercial',
      'catalog',
      'inventory',
      'customers',
      'users',
      'profile'
    ];

    applicationTabs.forEach(tab => expect(canAccessTab(administratorPermissions, tab)).toBe(true));
  });

  it('should translate the users, roles and permissions module in ES and ZH', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('usersAndPermissionsTitle')).toBe('Gestión de Usuarios, Roles y Permisos');
    expect(i18n.t('permissionMatrix')).toBe('Matriz de permisos');
    expect(systemRoleNames.cashier).toBe('Cajero');

    await i18n.changeLanguage('zh');
    expect(i18n.t('usersAndPermissionsTitle')).toBe('用户、角色与权限管理');
    expect(i18n.t('permissionMatrix')).toBe('权限矩阵');

    await i18n.changeLanguage('es');
  });

  it('should distinguish X report from Z report in ES and ZH', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('generateXReport')).toBe('Generar Corte X');
    expect(i18n.t('executeZReport')).toBe('Ejecutar Corte Z y cerrar');

    await i18n.changeLanguage('zh');
    expect(i18n.t('generateXReport')).toBe('生成 X 扎帐');
    expect(i18n.t('executeZReport')).toBe('执行 Z 扎帐并关班');

    await i18n.changeLanguage('es');
  });

  it('should translate point of sale totals and payment options in ES and ZH', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('pointOfSaleTitle')).toBe('Punto de Venta WPC Bajío');
    expect(i18n.t('tax')).toBe('Impuesto IVA');
    expect(i18n.t('mixedPayment')).toBe('Pago mixto');
    expect(i18n.t('availableStock', { quantity: 8 })).toBe('8 disponibles');

    await i18n.changeLanguage('zh');
    expect(i18n.t('pointOfSaleTitle')).toBe('WPC Bajío 销售点');
    expect(i18n.t('mixedPayment')).toBe('混合付款');
    expect(i18n.t('availableStock', { quantity: 8 })).toBe('可用 8 件');

    await i18n.changeLanguage('es');
  });

  it('should expose and translate commercial modules with dedicated permissions', async () => {
    expect(canAccessTab([permissionCodes.commercialQuotes], 'quotes')).toBe(true);
    expect(canAccessTab([permissionCodes.commercialContracts], 'contracts')).toBe(true);
    expect(canAccessTab([permissionCodes.commercialReturns], 'returns')).toBe(true);
    expect(canAccessTab([permissionCodes.salesProcess], 'quotes')).toBe(false);

    await i18n.changeLanguage('es');
    expect(i18n.t('customersPageTitle')).toBe('Directorio de Clientes WPC Bajío');
    expect(i18n.t('commercialOperationsTitle')).toBe('Operaciones comerciales y posventa');
    expect(i18n.t('storeCredit')).toBe('Saldo a favor / Nota de crédito');

    await i18n.changeLanguage('zh');
    expect(i18n.t('customersPageTitle')).toBe('WPC Bajío 客户目录');
    expect(i18n.t('commercialOperationsTitle')).toBe('商务与售后操作');

    await i18n.changeLanguage('es');
  });

  it('should present IdVenta as the operational sale folio in ES and ZH', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('saleNumber', { idVenta: 1054 })).toBe('Venta #1054');
    expect(i18n.t('saleCompleted', { idVenta: 1054 })).toContain('1054');

    await i18n.changeLanguage('zh');
    expect(i18n.t('saleNumber', { idVenta: 1054 })).toContain('1054');
    expect(i18n.t('saleCompleted', { idVenta: 1054 })).toContain('1054');

    await i18n.changeLanguage('es');
  });

  it('should guide payment searches to the operational receipt reference', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('searchInstallments')).toContain('RECIBO-{IdVenta}');

    await i18n.changeLanguage('zh');
    expect(i18n.t('searchInstallments')).toContain('RECIBO-{IdVenta}');

    await i18n.changeLanguage('es');
  });
});
