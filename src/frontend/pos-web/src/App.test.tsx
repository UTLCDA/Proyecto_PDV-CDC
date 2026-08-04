import { describe, it, expect } from 'vitest';
import i18n from './i18n';

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
});
