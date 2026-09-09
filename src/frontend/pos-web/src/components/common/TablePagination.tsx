import React from 'react';
import { useTranslation } from 'react-i18next';
import { UsePaginationResult } from '../../hooks/usePagination';
import './TablePagination.css';

export interface TablePaginationProps {
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  pagination?: UsePaginationResult;
}

export function getPageNumbers(currentPage: number, totalPages: number, maxButtons = 7): (number | string)[] {
  if (totalPages <= 0) return [];
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  pageNumber = pagination?.pageNumber ?? 1,
  pageSize = pagination?.pageSize ?? 25,
  totalItems = pagination?.totalItems ?? 0,
  totalPages = pagination?.totalPages ?? 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  disabled = false,
}) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const handlePageChange = (page: number) => {
    if (disabled) return;
    if (page < 1 || page > totalPages || page === pageNumber) return;
    if (onPageChange) {
      onPageChange(page);
    } else if (pagination) {
      pagination.setPageNumber(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (disabled) return;
    if (onPageSizeChange) {
      onPageSizeChange(size);
    } else if (pagination) {
      pagination.setPageSize(size);
    }
  };

  const effectiveTotalPages = Math.max(1, totalPages);
  const startRecord = totalItems === 0 ? 0 : Math.min((pageNumber - 1) * pageSize + 1, totalItems);
  const endRecord = Math.min(pageNumber * pageSize, totalItems);
  const pages = totalItems === 0 ? [1] : getPageNumbers(pageNumber, effectiveTotalPages);

  return (
    <div className="table-pagination-container" role="navigation" aria-label="Pagination">
      <div className="table-pagination-info">
        {isZh ? (
          <span>
            {totalItems === 0 ? (
              '暂无数据'
            ) : (
              <>
                显示第 <strong>{startRecord}</strong> 至 <strong>{endRecord}</strong> 条，共 <strong>{totalItems}</strong> 条
              </>
            )}
          </span>
        ) : (
          <span>
            {totalItems === 0 ? (
              'Sin registros'
            ) : (
              <>
                Mostrando <strong>{startRecord}</strong> a <strong>{endRecord}</strong> de <strong>{totalItems}</strong> registros
              </>
            )}
          </span>
        )}
      </div>

      <div className="table-pagination-controls">
        <div className="table-pagination-size">
          <label htmlFor="pagination-page-size-select" className="sr-only">
            {isZh ? '每页行数' : 'Registros por página'}
          </label>
          <select
            id="pagination-page-size-select"
            className="table-pagination-select"
            value={pageSize}
            disabled={disabled || totalItems === 0}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            aria-label={isZh ? '每页行数' : 'Registros por página'}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} {isZh ? '条/页' : '/ pág'}
              </option>
            ))}
          </select>
        </div>

        <nav className="table-pagination-nav" aria-label="Page navigation">
          {/* First page button */}
          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(1)}
            disabled={disabled || totalItems === 0 || pageNumber <= 1}
            title={isZh ? '首页' : 'Primera página'}
            aria-label={isZh ? '首页' : 'Primera página'}
          >
            &laquo;
          </button>

          {/* Previous page button */}
          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(pageNumber - 1)}
            disabled={disabled || totalItems === 0 || pageNumber <= 1}
            title={isZh ? '上一页' : 'Página anterior'}
            aria-label={isZh ? '上一页' : 'Página anterior'}
          >
            &lsaquo;
          </button>

          {/* Page numbers */}
          {pages.map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={`page-${p}`}
                type="button"
                className={`pagination-btn ${p === pageNumber ? 'is-active' : ''}`}
                onClick={() => handlePageChange(p)}
                disabled={disabled || totalItems === 0}
                aria-current={p === pageNumber ? 'page' : undefined}
              >
                {p}
              </button>
            ) : (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                {p}
              </span>
            )
          )}

          {/* Next page button */}
          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(pageNumber + 1)}
            disabled={disabled || totalItems === 0 || pageNumber >= effectiveTotalPages}
            title={isZh ? '下一页' : 'Página siguiente'}
            aria-label={isZh ? '下一页' : 'Página siguiente'}
          >
            &rsaquo;
          </button>

          {/* Last page button */}
          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(effectiveTotalPages)}
            disabled={disabled || totalItems === 0 || pageNumber >= effectiveTotalPages}
            title={isZh ? '尾页' : 'Última página'}
            aria-label={isZh ? '尾页' : 'Última página'}
          >
            &raquo;
          </button>
        </nav>
      </div>
    </div>
  );
};

export default TablePagination;
