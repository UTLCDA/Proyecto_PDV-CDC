import { useState, useCallback, useMemo } from 'react';
import { PagedResult } from '../types/pagination';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginationResult {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  setPageNumber: (page: number) => void;
  setPageSize: (size: number) => void;
  setPaginationFromResult: <T>(result: Partial<PagedResult<T>>) => void;
  resetPage: () => void;
  nextPage: () => void;
  previousPage: () => void;
  queryParams: {
    pageNumber: number;
    page: number;
    pageSize: number;
  };
}

export function calculateTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function calculateRecordRange(
  pageNumber: number,
  pageSize: number,
  totalItems: number
): { startRecord: number; endRecord: number } {
  if (totalItems <= 0) return { startRecord: 0, endRecord: 0 };
  const startRecord = Math.min((pageNumber - 1) * pageSize + 1, totalItems);
  const endRecord = Math.min(pageNumber * pageSize, totalItems);
  return { startRecord, endRecord };
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, initialPageSize = 25 } = options;

  const [pageNumber, setPageNumberState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const setPageNumber = useCallback((page: number) => {
    setPageNumberState(Math.max(1, page));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageNumberState(1); // Al cambiar tamaño de página siempre regresar a página 1
  }, []);

  const resetPage = useCallback(() => {
    setPageNumberState(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageNumberState((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPageNumberState((prev) => (prev > 1 ? prev - 1 : 1));
  }, []);

  const setPaginationFromResult = useCallback(<T,>(result?: Partial<PagedResult<T>> | any) => {
    if (!result) return;
    const total = result.totalItems ?? result.TotalItems ?? result.totalCount ?? result.TotalCount;
    if (total !== undefined && total !== null) {
      setTotalItems(Number(total));
    }
    const pages = result.totalPages ?? result.TotalPages ?? result.pageCount ?? result.PageCount;
    if (pages !== undefined && pages !== null) {
      setTotalPages(Math.max(1, Number(pages)));
    } else if (total !== undefined && total !== null) {
      const size = result.pageSize ?? result.PageSize ?? pageSize;
      setTotalPages(calculateTotalPages(Number(total), Number(size)));
    }
    const pageNum = result.pageNumber ?? result.PageNumber ?? result.page ?? result.Page;
    if (pageNum !== undefined && pageNum !== null) {
      setPageNumberState(Math.max(1, Number(pageNum)));
    }
    const sizeVal = result.pageSize ?? result.PageSize;
    if (sizeVal !== undefined && sizeVal !== null) {
      setPageSizeState(Number(sizeVal));
    }
  }, [pageSize]);

  const hasPreviousPage = pageNumber > 1;
  const hasNextPage = pageNumber < totalPages;

  const queryParams = useMemo(() => ({
    pageNumber,
    page: pageNumber,
    pageSize,
  }), [pageNumber, pageSize]);

  return {
    pageNumber,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    setPageNumber,
    setPageSize,
    setPaginationFromResult,
    resetPage,
    nextPage,
    previousPage,
    queryParams,
  };
}

export default usePagination;
