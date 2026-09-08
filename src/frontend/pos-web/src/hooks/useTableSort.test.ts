import { describe, it, expect } from 'vitest';
import { getNextSortDirection, sortTableData } from './useTableSort';

interface TestItem {
  id: number;
  name: string;
  amount: number;
  date: string;
  active: boolean;
  notes?: string | null;
}

const mockData: TestItem[] = [
  { id: 3, name: 'LAM-10', amount: 150.5, date: '2026-09-03T10:00:00Z', active: true, notes: 'Nota C' },
  { id: 1, name: 'LAM-2', amount: 50.0, date: '2026-09-01T10:00:00Z', active: false, notes: null },
  { id: 2, name: 'LAM-1', amount: 300.0, date: '2026-09-05T10:00:00Z', active: true, notes: 'Nota A' }
];

describe('useTableSort Logic Tests', () => {
  it('debe calcular correctamente el ciclo tri-estado de ordenamiento', () => {
    // Inicial: sin orden
    let step1 = getNextSortDirection(null, 'amount', null);
    expect(step1).toEqual({ nextKey: 'amount', nextDirection: 'asc' });

    // 2° Clic sobre la misma columna: pasa a desc
    let step2 = getNextSortDirection('amount', 'amount', 'asc');
    expect(step2).toEqual({ nextKey: 'amount', nextDirection: 'desc' });

    // 3° Clic sobre la misma columna: pasa a null (sin orden)
    let step3 = getNextSortDirection('amount', 'amount', 'desc');
    expect(step3).toEqual({ nextKey: null, nextDirection: null });

    // Clic en columna diferente: siempre inicia en asc
    let step4 = getNextSortDirection('amount', 'name', 'desc');
    expect(step4).toEqual({ nextKey: 'name', nextDirection: 'asc' });
  });

  it('debe retornar los datos intactos si sortKey o sortDirection son null', () => {
    const res1 = sortTableData(mockData, null, null);
    expect(res1).toEqual(mockData);

    const res2 = sortTableData(mockData, 'amount', null);
    expect(res2).toEqual(mockData);
  });

  it('debe ordenar números ascendente y descendente', () => {
    const asc = sortTableData(mockData, 'amount', 'asc');
    expect(asc.map(d => d.amount)).toEqual([50.0, 150.5, 300.0]);

    const desc = sortTableData(mockData, 'amount', 'desc');
    expect(desc.map(d => d.amount)).toEqual([300.0, 150.5, 50.0]);
  });

  it('debe ordenar cadenas alfanuméricas con orden natural (LAM-1, LAM-2, LAM-10)', () => {
    const asc = sortTableData(mockData, 'name', 'asc');
    expect(asc.map(d => d.name)).toEqual(['LAM-1', 'LAM-2', 'LAM-10']);

    const desc = sortTableData(mockData, 'name', 'desc');
    expect(desc.map(d => d.name)).toEqual(['LAM-10', 'LAM-2', 'LAM-1']);
  });

  it('debe ordenar fechas ISO cronológicamente', () => {
    const asc = sortTableData(mockData, 'date', 'asc');
    expect(asc.map(d => d.id)).toEqual([1, 3, 2]); // Sep 01, Sep 03, Sep 05

    const desc = sortTableData(mockData, 'date', 'desc');
    expect(desc.map(d => d.id)).toEqual([2, 3, 1]); // Sep 05, Sep 03, Sep 01
  });

  it('debe colocar valores nulos o indefinidos al final', () => {
    const asc = sortTableData(mockData, 'notes', 'asc');
    expect(asc.map(d => d.notes)).toEqual(['Nota A', 'Nota C', null]);
  });

  it('debe soportar extractores de valor personalizados', () => {
    const asc = sortTableData(mockData, 'customStatus', 'asc', {
      valueExtractors: {
        customStatus: item => (item.active ? 'Activo' : 'Inactivo')
      }
    });
    expect(asc.map(d => d.active)).toEqual([true, true, false]);
  });

  it('debe soportar comparadores personalizados', () => {
    const desc = sortTableData(mockData, 'customInverse', 'asc', {
      customComparators: {
        customInverse: (a, b) => b.id - a.id
      }
    });
    expect(desc.map(d => d.id)).toEqual([3, 2, 1]);
  });
});
