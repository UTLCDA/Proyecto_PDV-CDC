import React from 'react';
import { SortDirection } from '../../hooks/useTableSort';

export interface SortableThProps {
  sortKey?: string;
  columnKey?: string;
  currentSortKey?: string | null;
  activeSortKey?: string | null;
  currentSortDirection?: SortDirection;
  sortDirection?: SortDirection;
  onSort: (key: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  title?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({
  sortKey,
  columnKey,
  currentSortKey,
  activeSortKey,
  currentSortDirection,
  sortDirection,
  onSort,
  children,
  className = '',
  style,
  align = 'left',
  title
}) => {
  const effectiveSortKey = (sortKey ?? columnKey) || '';
  const effectiveActiveSortKey = currentSortKey !== undefined ? currentSortKey : (activeSortKey ?? null);
  const effectiveSortDirection = currentSortDirection !== undefined ? currentSortDirection : (sortDirection ?? null);

  const isSorted = effectiveActiveSortKey === effectiveSortKey && effectiveSortDirection !== null;
  const isAsc = isSorted && effectiveSortDirection === 'asc';
  const isDesc = isSorted && effectiveSortDirection === 'desc';

  const defaultTitle = isAsc
    ? 'Orden ascendente activo. Clic para ordenar descendente.'
    : isDesc
    ? 'Orden descendente activo. Clic para restablecer orden.'
    : 'Clic para ordenar ascendente.';

  const ariaSort = isAsc ? 'ascending' : isDesc ? 'descending' : 'none';

  const justify = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    <th
      className={`th-sortable ${isSorted ? 'th-sortable--active' : ''} ${className}`.trim()}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: align,
        ...style
      }}
      onClick={() => onSort(effectiveSortKey)}
      title={title || defaultTitle}
      aria-sort={ariaSort}
      role="columnheader"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(effectiveSortKey);
        }
      }}
    >
      <span
        className="th-sortable__content"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          justifyContent: justify,
          width: '100%'
        }}
      >
        <span>{children}</span>
        <span
          className={`th-sortable__icon ${isSorted ? 'th-sortable__icon--active' : ''}`}
          aria-hidden="true"
        >
          {isAsc ? '↑' : isDesc ? '↓' : '⇅'}
        </span>
      </span>
    </th>
  );
};

export default SortableTh;
