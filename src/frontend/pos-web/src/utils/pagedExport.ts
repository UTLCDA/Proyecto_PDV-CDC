import { PagedResult } from '../types/pagination';

export interface PagingRequest {
  page: number;
  pageSize: number;
  pageNumber?: number;
}

export type PagedExportKind = 'pdf' | 'excel';

interface LoadAllPagesOptions {
  pageSize?: number;
  maximumRows?: number;
}

const defaultPageSize = 500;
const defaultMaximumRows = 100_000;

export const appendPaging = (params: URLSearchParams, paging?: PagingRequest) => {
  if (!paging) return;
  params.set('page', String(paging.page));
  params.set('pageNumber', String(paging.pageNumber ?? paging.page));
  params.set('pageSize', String(paging.pageSize));
};

export const appendSorting = (params: URLSearchParams, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
  if (sortBy) params.set('sortBy', sortBy);
  if (sortDirection) params.set('sortDirection', sortDirection);
};

export const loadAllPages = async <T,>(
  loadPage: (paging: PagingRequest) => Promise<T[] | PagedResult<T>>,
  options: LoadAllPagesOptions = {}
) => {
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? defaultPageSize));
  const maximumRows = Math.max(pageSize, options.maximumRows ?? defaultMaximumRows);
  const rows: T[] = [];

  for (let page = 1; ; page += 1) {
    const result = await loadPage({ page, pageSize });
    const pageRows: T[] = Array.isArray(result) ? result : (result?.items ?? []);
    if (rows.length + pageRows.length > maximumRows) {
      throw new Error(`La exportación supera el límite seguro de ${maximumRows.toLocaleString('es-MX')} registros. Reduzca los filtros e intente nuevamente.`);
    }
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
  }
};

export const loadAllPagesForExport = <T,>(
  kind: PagedExportKind,
  loadPage: (paging: PagingRequest) => Promise<T[] | PagedResult<T>>
) => loadAllPages(loadPage, { maximumRows: kind === 'pdf' ? 10_000 : 50_000 });
