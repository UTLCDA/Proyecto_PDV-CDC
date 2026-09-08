import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export type ValueExtractor<T> = (item: T) => any;

export interface UseTableSortOptions<T> {
  initialKey?: string | null;
  initialDirection?: SortDirection;
  customComparators?: Record<string, (a: T, b: T) => number>;
  valueExtractors?: Record<string, ValueExtractor<T>>;
}

export interface UseTableSortResult<T> {
  sortedData: T[];
  sortKey: string | null;
  sortDirection: SortDirection;
  handleSort: (key: string) => void;
  resetSort: () => void;
}

/**
 * Calcula la siguiente dirección de ordenamiento en ciclo tri-estado:
 * null -> 'asc' -> 'desc' -> null
 */
export function getNextSortDirection(
  currentKey: string | null,
  targetKey: string,
  currentDirection: SortDirection
): { nextKey: string | null; nextDirection: SortDirection } {
  if (currentKey !== targetKey) {
    return { nextKey: targetKey, nextDirection: 'asc' };
  }
  if (currentDirection === 'asc') {
    return { nextKey: targetKey, nextDirection: 'desc' };
  }
  if (currentDirection === 'desc') {
    return { nextKey: null, nextDirection: null };
  }
  return { nextKey: targetKey, nextDirection: 'asc' };
}

/**
 * Función pura para ordenar colecciones de datos según clave y dirección
 */
export function sortTableData<T>(
  data: T[],
  sortKey: string | null,
  sortDirection: SortDirection,
  options: {
    customComparators?: Record<string, (a: T, b: T) => number>;
    valueExtractors?: Record<string, ValueExtractor<T>>;
  } = {}
): T[] {
  if (!sortKey || !sortDirection || !Array.isArray(data) || data.length === 0) {
    return data;
  }

  const { customComparators = {}, valueExtractors = {} } = options;
  const items = [...data];
  const customComp = customComparators[sortKey];
  const extractor = valueExtractors[sortKey];

  items.sort((a, b) => {
    if (customComp) {
      const res = customComp(a, b);
      return sortDirection === 'asc' ? res : -res;
    }

    const valA = extractor ? extractor(a) : (a as any)[sortKey];
    const valB = extractor ? extractor(b) : (b as any)[sortKey];

    // Valores nulos o indefinidos siempre al final
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    // Números y booleanos
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      const numA = valA ? 1 : 0;
      const numB = valB ? 1 : 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    // Fechas (Date objects o strings ISO de fecha)
    if (valA instanceof Date && valB instanceof Date) {
      return sortDirection === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    }

    // Strings (con soporte alfanumérico natural y acentos)
    const strA = String(valA).trim();
    const strB = String(valB).trim();

    // Detección de cadenas ISO de fecha comunes (ej. 2026-09-08T...)
    const isDateA = /^\d{4}-\d{2}-\d{2}/.test(strA) && !isNaN(Date.parse(strA));
    const isDateB = /^\d{4}-\d{2}-\d{2}/.test(strB) && !isNaN(Date.parse(strB));
    if (isDateA && isDateB) {
      const timeA = new Date(strA).getTime();
      const timeB = new Date(strB).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    }

    const comparison = strA.localeCompare(strB, undefined, {
      numeric: true,
      sensitivity: 'base'
    });

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return items;
}

/**
 * Hook reutilizable para ordenamiento tri-estado de tablas:
 * 1. Clic -> Ascendente (asc)
 * 2. Clic -> Descendente (desc)
 * 3. Clic -> Sin orden (null / orden original)
 */
export function useTableSort<T>(
  data: T[],
  options: UseTableSortOptions<T> = {}
): UseTableSortResult<T> {
  const {
    initialKey = null,
    initialDirection = null,
    customComparators = {},
    valueExtractors = {}
  } = options;

  const [sortKey, setSortKey] = useState<string | null>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = (key: string) => {
    const next = getNextSortDirection(sortKey, key, sortDirection);
    setSortKey(next.nextKey);
    setSortDirection(next.nextDirection);
  };

  const resetSort = () => {
    setSortKey(null);
    setSortDirection(null);
  };

  const sortedData = useMemo(() => {
    return sortTableData(data, sortKey, sortDirection, {
      customComparators,
      valueExtractors
    });
  }, [data, sortKey, sortDirection, customComparators, valueExtractors]);

  return {
    sortedData,
    sortKey,
    sortDirection,
    handleSort,
    resetSort
  };
}

export default useTableSort;
